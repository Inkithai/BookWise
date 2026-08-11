// components/roles/PermissionsTable.tsx - Fixed Version
"use client";

import { useState, useEffect, Fragment, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Save,
  RefreshCw 
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getRoleWithPermissions, 
  assignPermissionsToRole,
  AVAILABLE_PERMISSIONS 
} from "@/services/service";
import { toast } from "sonner";
import { Permission } from "@/services/interface/Role";

interface PermissionGroup {
  category: string;
  permissions: {
    name: string;
    description: string;
    enabled: boolean;
  }[];
}

interface PermissionsTableProps {
  roleId: number;
  roleName: string;
}

export default function PermissionsTable({ roleId, roleName }: PermissionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPermissionsPage, setExpandedPermissionsPage] = useState<Record<string, number>>({});
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRolePermissions, setCurrentRolePermissions] = useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});

  // Group permissions by category
  const groupPermissionsByCategory = useCallback((rolePermissions: string[]) => {
    const groups: Record<string, PermissionGroup> = {};
    
    AVAILABLE_PERMISSIONS.forEach((permission: Permission) => {
      if (!groups[permission.category]) {
        groups[permission.category] = {
          category: permission.category,
          permissions: [],
        };
      }
      
      const isEnabled = rolePermissions.includes(permission.name);
      const finalEnabled = pendingChanges[permission.name] !== undefined 
        ? pendingChanges[permission.name] 
        : isEnabled;
        
      groups[permission.category].permissions.push({
        name: permission.name,
        description: permission.description,
        enabled: finalEnabled,
      });
    });
    
    return Object.values(groups);
  }, [pendingChanges]);

  const fetchRolePermissions = useCallback(async () => {
    setLoading(true);
    try {
      console.log(`Fetching permissions for role ${roleId}`);
      const response = await getRoleWithPermissions(roleId);
      
      if (response && response.data) {
        const permissions = response.data.permissions || [];
        console.log('Fetched permissions:', permissions);
        setCurrentRolePermissions(permissions);
        setPermissionGroups(groupPermissionsByCategory(permissions));
      } else {
        console.error('Invalid response structure:', response);
        toast.error("Invalid response from server");
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch role permissions";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [roleId, groupPermissionsByCategory]);

  // Initial load only
  useEffect(() => {
    if (roleId) {
      fetchRolePermissions();
    }
  }, [roleId]); // Removed fetchRolePermissions from dependencies

  // Update permission groups when pending changes change (WITHOUT loading state)
  useEffect(() => {
    setPermissionGroups(groupPermissionsByCategory(currentRolePermissions));
  }, [currentRolePermissions, pendingChanges, groupPermissionsByCategory]);

  const filteredGroups = permissionGroups.filter((group) =>
    group.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.permissions.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalEntries = filteredGroups.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const toggleGroupExpansion = (category: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    if (!expandedGroups[category]) {
      setExpandedPermissionsPage(prev => ({
        ...prev,
        [category]: 1
      }));
    }
  };

  const handlePermissionPageChange = (category: string, page: number) => {
    setExpandedPermissionsPage(prev => ({
      ...prev,
      [category]: page
    }));
  };

  const handleTogglePermission = (permissionName: string, enabled: boolean) => {
    console.log(`Toggling permission ${permissionName} to ${enabled}`);
    setPendingChanges(prev => ({
      ...prev,
      [permissionName]: enabled
    }));
  };

  const handleSelectAllInCategory = (category: string, enabled: boolean) => {
    const group = permissionGroups.find(g => g.category === category);
    if (!group) return;

    const newChanges = { ...pendingChanges };
    group.permissions.forEach(permission => {
      newChanges[permission.name] = enabled;
    });
    setPendingChanges(newChanges);
  };

  const isCategoryFullySelected = (category: string): boolean | null => {
    const group = permissionGroups.find(g => g.category === category);
    if (!group) return null;

    const allPermissions = group.permissions.map(p => p.name);
    const selectedCount = allPermissions.filter(name => {
      if (pendingChanges[name] !== undefined) return pendingChanges[name];
      return currentRolePermissions.includes(name);
    }).length;

    if (selectedCount === 0) return false;
    if (selectedCount === allPermissions.length) return true;
    return null; // Partially selected
  };

  const savePermissions = async () => {
    if (!roleId) {
      toast.error("Invalid role ID");
      return;
    }

    setSaving(true);
    try {
      // Calculate final permissions array
      const finalPermissions = AVAILABLE_PERMISSIONS
        .filter(permission => {
          // Check if there's a pending change
          if (pendingChanges[permission.name] !== undefined) {
            return pendingChanges[permission.name];
          }
          // Otherwise use current state
          return currentRolePermissions.includes(permission.name);
        })
        .map(permission => permission.name);

      console.log('Saving permissions:', finalPermissions);

      const response = await assignPermissionsToRole(roleId, { permissions: finalPermissions });
      
      if (response && response.success) {
        // Update current state and clear pending changes
        setCurrentRolePermissions(finalPermissions);
        setPendingChanges({});
        
        toast.success("Permissions updated successfully");
        
        // Refresh the data (this will show loading)
        await fetchRolePermissions();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update permissions";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const renderExpandedPermissions = (group: PermissionGroup) => {
    const currentPage = expandedPermissionsPage[group.category] || 1;
    const permissionsPerPage = 5;
    const totalPermissionPages = Math.ceil(group.permissions.length / permissionsPerPage);
    const paginatedPermissions = group.permissions.slice(
      (currentPage - 1) * permissionsPerPage,
      currentPage * permissionsPerPage
    );

    const selectionState = isCategoryFullySelected(group.category);

    return (
      <div className="ml-4 lg:ml-12 p-3 lg:p-4 space-y-4">
        {/* Select All Controls */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
          <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectAllInCategory(group.category, true)}
            className="text-xs h-8"
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectAllInCategory(group.category, false)}
            className="text-xs h-8"
          >
            Deselect All
          </Button>
          {selectionState !== null && (
            <div className="ml-auto">
              <span className={`text-xs font-medium ${
                selectionState ? 'text-green-600' : 'text-orange-600'
              }`}>
                {selectionState ? 'All Enabled' : 'None Enabled'}
              </span>
            </div>
          )}
        </div>

        {/* Permissions Table - Responsive */}
        <div className="overflow-x-auto">
          <ShadTable>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Permission</TableHead>
                <TableHead className="w-[45%]">Description</TableHead>
                <TableHead className="w-[15%] text-center">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPermissions.map((permission) => (
                <TableRow key={`${group.category}-${permission.name}`}>
                  <TableCell className="font-mono text-sm break-all">{permission.name}</TableCell>
                  <TableCell className="text-sm break-words">{permission.description}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={permission.enabled}
                      onCheckedChange={(checked) => 
                        handleTogglePermission(permission.name, checked)
                      }
                      disabled={loading || saving}
                      aria-label={`Toggle ${permission.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ShadTable>
        </div>

        {group.permissions.length > permissionsPerPage && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {((currentPage - 1) * permissionsPerPage) + 1} to{" "}
              {Math.min(currentPage * permissionsPerPage, group.permissions.length)} of{" "}
              {group.permissions.length} permissions
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePermissionPageChange(group.category, currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPermissionPages}
                onClick={() => handlePermissionPageChange(group.category, currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Responsive Layout */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Permissions - {roleName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage permissions for this role
          </p>
        </div>

      </div>

      {/* Search and Filters - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <Input
          placeholder="Search permissions or categories..."
          className="w-full sm:max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Categories per page</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-1 flex-1 sm:flex-initial">
                <span>{itemsPerPage}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[5, 10, 20, 30].map((value) => (
                <DropdownMenuItem
                  key={`per-page-${value}`}
                  onClick={() => handleItemsPerPageChange(value)}
                >
                  {value}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Unsaved Changes Banner — below search bar */}
      {hasChanges && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-lg border border-teal-300 bg-teal-50 dark:bg-teal-950/40 dark:border-teal-600">
          <span className="text-sm font-medium text-teal-800 dark:text-teal-300">
            ⚠️ You have{' '}
            <strong>{Object.keys(pendingChanges).length}</strong>{' '}
            unsaved {Object.keys(pendingChanges).length === 1 ? 'change' : 'changes'}.
            Click &quot;Save Changes&quot; to apply them.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingChanges({})}
              className="border-teal-300 text-teal-800 hover:bg-teal-100 dark:border-teal-600 dark:text-teal-300 dark:hover:bg-teal-900/40"
            >
              Discard Changes
            </Button>
            <Button
              size="sm"
              onClick={savePermissions}
              disabled={saving || !roleId}
              className="bg-teal-500 hover:bg-teal-600 text-white min-w-[130px]"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <ShadTable>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Permissions Count</TableHead>
              <TableHead className="text-center">Enabled Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.map((group) => {
              const enabledCount = group.permissions.filter(p => p.enabled).length;
              const totalCount = group.permissions.length;
              const selectionState = isCategoryFullySelected(group.category);
              
              return (
                <Fragment key={`group-${group.category}`}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleGroupExpansion(group.category)}
                        className="h-8 w-8"
                      >
                        {expandedGroups[group.category] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{group.category}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                        {totalCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center text-sm font-medium ${
                        enabledCount === totalCount ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {enabledCount} / {totalCount}
                      </span>
                    </TableCell>
                  </TableRow>
                  {expandedGroups[group.category] && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        {renderExpandedPermissions(group)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </ShadTable>

        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-3">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing {showingFrom} to {showingTo} of {totalEntries} categories
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}