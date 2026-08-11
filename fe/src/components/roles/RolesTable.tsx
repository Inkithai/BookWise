// components/roles/RoleTable.tsx
"use client";

import { useState, useEffect } from "react";
import { Table, Column, CardConfig } from "@/components/elements/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Edit, Trash2, Key, PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/slices/store";
import { fetchRoles, deleteExistingRole } from "@/slices/roleSlice";
import { RoleDataTable } from "@/services/interface/Role";
import { getViewScope, ViewScope } from "@/utils/view-scope";
import { usePermissions } from '@/utils/permissions';

export default function RolesTable() {
  const dispatch = useDispatch<AppDispatch>();
  const { roles, loading, pagination } = useSelector(
    (state: RootState) => state.roles
  );
  const { can } = usePermissions();

  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  const [viewScope, setViewScopeState] = useState<ViewScope>("current");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setViewScopeState(getViewScope());
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  const isAllView = viewScope === "all";

  // Helper function to extract ID from action string
  const extractIdFromAction = (action: string): number => {
    const match = action.match(/data-id="(\d+)"/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const fetchRolesData = async () => {
    try {
      await dispatch(fetchRoles({
        search: searchTerm,
        start: (currentPage - 1) * itemsPerPage,
        length: itemsPerPage,
        draw: currentPage
      })).unwrap();
    } catch (error) {
      toast.error("Failed to fetch roles");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, [currentPage, itemsPerPage, searchTerm, dispatch]);

  const totalPages = Math.ceil(pagination.recordsTotal / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, pagination.recordsTotal);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleDelete = async (roleId: number) => {
    setRoleToDelete(roleId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      await dispatch(deleteExistingRole(roleToDelete)).unwrap();
      toast.success("Role deleted successfully");
      fetchRolesData();
    } catch (error) {
      toast.error("Failed to delete role");
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const hideEditDeleteForRole = (roleName: string): boolean => {
    const normalized = roleName.trim().toLowerCase();
    return normalized === "super-admin" || normalized === "admin";
  };

  const columns: Column<RoleDataTable>[] = [
    {
      header: "#",
      accessor: "DT_RowIndex",
      cell: (row) => row.DT_RowIndex,
      priority: 1, // Always show
    },
    {
      header: "Name",
      accessor: "name",
      priority: 1, // Always show
    },
    {
      header: "Created At",
      accessor: "created_at",
      cell: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A',
      priority: 4, // Desktop only
    },
    {
      header: "Action",
      accessor: "action",
      cell: (row) => {
        const roleId = extractIdFromAction(row.action);
        const hideEditDelete = hideEditDeleteForRole(row.name);
        return (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              {!hideEditDelete && can('role.edit') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={isAllView ? '#' : `/roles/edit/${roleId}`} onClick={isAllView ? (e) => e.preventDefault() : undefined}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isAllView} title={isAllView ? "Edit is disabled in All-Accounts view" : ""}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit role</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {!hideEditDelete && can('role.delete') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(roleId)}
                      disabled={isAllView}
                      title={isAllView ? "Delete is disabled in All-Accounts view" : ""}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete role</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {can('permission.view') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={isAllView ? '#' : `/roles/permissions/${roleId}`} onClick={isAllView ? (e) => e.preventDefault() : undefined}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isAllView} title={isAllView ? "Permissions disabled in All-Accounts view" : ""}>
                        <Key className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Manage permissions</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        );
      },
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const roleCardConfig: CardConfig<RoleDataTable> = {
    title: (row) => row.name || 'Unknown Role',
    subtitle: (row) => {
      const date = row.created_at;
      return date ? `Created: ${new Date(date).toLocaleDateString()}` : 'No date';
    },
    primaryMetric: {
      field: 'DT_RowIndex',
      label: 'Role #',
      format: (val) => `#${val}`,
    },
    actions: (row) => {
      const roleId = extractIdFromAction(row.action);
      const hideEditDelete = hideEditDeleteForRole(row.name);
      return (
        <div className="flex gap-3">
          {!hideEditDelete && can('role.edit') && (
            <Link href={isAllView ? '#' : `/roles/edit/${roleId}`} className="flex-1" onClick={isAllView ? (e) => e.preventDefault() : undefined}>
              <Button className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl" disabled={isAllView} title={isAllView ? "Edit is disabled in All-Accounts view" : ""}>
                <Edit className="h-5 w-5 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {can('permission.view') && (
            <Link href={isAllView ? '#' : `/roles/permissions/${roleId}`} className="flex-1" onClick={isAllView ? (e) => e.preventDefault() : undefined}>
              <Button
                variant="outline"
                className="h-14 min-h-[56px] text-base font-semibold rounded-xl"
                disabled={isAllView}
                title={isAllView ? "Permissions disabled in All-Accounts view" : ""}
              >
                <Key className="h-5 w-5 mr-2" />
                Permissions
              </Button>
            </Link>
          )}
        </div>
      );
    },
  };

  return (
    <>
      <div className="flex justify-end items-center mb-4">
        {can('role.create') && (
          <Link href="/roles/create">
            <Button>Create Role</Button>
          </Link>
        )}
      </div>

      {/* Search and Filters - Responsive Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <Input
          placeholder="Search roles..."
          className="w-full sm:max-w-sm lg:max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-1 flex-1 sm:flex-initial">
                <span>{itemsPerPage}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[10, 20, 30, 50].map((value) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => handleItemsPerPageChange(value)}
                >
                  {value}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Custom Table Styling for Better Desktop Row Height */}
      <style jsx global>{`
        .roles-table table tbody tr {
          @apply py-2;
        }
        .roles-table table tbody td {
          @apply py-3 px-4;
        }
      `}</style>

      <Table
        data={roles}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={pagination.recordsTotal}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        loading={loading}
        cardConfig={roleCardConfig}
        tableName="roles"
        className="roles-table"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}