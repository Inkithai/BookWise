// components/users/users-content.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Table, Column, CardConfig } from '@/components/elements/Table';
import { Edit, Trash2, PowerOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsersToolbar } from './users-toolbar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AdminUser } from '@/services/interface/AdminUser';
import { getUsers, deleteUser, getCurrentUser, switchAccountContext } from '@/services/service';
import { getViewScope, ViewScope } from '@/utils/view-scope';
import { usePermissions } from '@/utils/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GetUsersParams {
  search?: string;
  start?: number;
  length?: number;
  per_page?: number;
  page?: number;
  is_active?: number;
}

export function UsersContent() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const statusFilter: 'all' | 'active' | 'inactive' = 'all';
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'deactivate'; userId: number } | null>(null);
  const [viewScope, setViewScopeState] = useState<ViewScope>("current");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setViewScopeState(getViewScope());
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  const isAllView = viewScope === "all";

  const fetchData = useCallback(async (retryCount = 0) => {
    const maxRetries = 1;
    try {
      setLoading(true);
      setError(null);

      const params: GetUsersParams = {
        search: search.trim(),
        start: (currentPage - 1) * itemsPerPage,
        length: itemsPerPage,
        per_page: itemsPerPage,
        page: currentPage
      };

      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active' ? 1 : 0;
      }

      if (isAllView) {
        // Clear stale data so loading skeleton shows immediately
        setUsers([]);
        setTotalEntries(0);

        // "All" scope: fetch from every context and merge (same pattern as InvoiceClientTable)
        const meResponse = await getCurrentUser();
        const me = (meResponse as any)?.data ?? meResponse;

        const companies = (Array.isArray(me?.available_companies) ? me.available_companies : [])
          .map((company: any) => ({
            id: Number(company?.id ?? company?.company_id),
            host_id: Number(company?.host_id),
            company_name: company?.company_name || company?.name || '',
          }))
          .filter((company: any) => Number.isFinite(company.id) && company.id > 0);

        const originalType: 'personal' | 'company' =
          me?.current_context?.type === 'company' ? 'company' : 'personal';
        const originalCompanyIdRaw = Number(me?.current_context?.company_id ?? me?.active_company_id);
        const originalCompanyId = Number.isFinite(originalCompanyIdRaw) && originalCompanyIdRaw > 0
          ? originalCompanyIdRaw
          : null;

        const merged: AdminUser[] = [];
        const seen = new Set<number>();
        const pushUnique = (rows: AdminUser[]) => {
          rows.forEach((user) => {
            if (!seen.has(user.id)) {
              seen.add(user.id);
              merged.push(user);
            }
          });
        };

        try {
          // Fetch personal users
          await switchAccountContext({ type: 'personal' });
          const personalResp = await getUsers(params);
          if (Array.isArray(personalResp?.data)) pushUnique(personalResp.data);

          // Fetch users for each company
          for (const company of companies) {
            await switchAccountContext({ type: 'company', company_id: company.id });
            const companyResp = await getUsers(params);
            if (Array.isArray(companyResp?.data)) pushUnique(companyResp.data);
          }
        } finally {
          // Restore original context
          if (originalType === 'company' && originalCompanyId) {
            await switchAccountContext({ type: 'company', company_id: originalCompanyId });
          } else {
            await switchAccountContext({ type: 'personal' });
          }
        }

        setUsers(merged);
        setTotalEntries(merged.length);
        setError(null);
      } else {
        // "Current" scope: only fetch for the active context
        const response = await getUsers(params);

        if (!response || typeof response !== 'object') {
          throw new Error('Invalid response format from server');
        }

        if (!Array.isArray(response.data)) {
          console.error('Invalid data format:', response);
          throw new Error('Expected data to be an array');
        }

        setUsers(response.data);
        setTotalEntries(response.recordsTotal || response.data.length);
        setError(null);
      }
    } catch (error: any) {
      console.error(`Failed to load users (attempt ${retryCount + 1}):`, error);
      const status = error?.response?.status;
      const code = error?.code;
      const shouldRetry = !status || status >= 500 || code === 'ERR_NETWORK';

      if (shouldRetry && retryCount < maxRetries) {
        // Single short retry only for network/server failures.
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, 600);
        return;
      }

      // All retries failed
      let errorMessage = 'Failed to load users';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setUsers([]);
      setTotalEntries(0);
      toast.error(`${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [search, currentPage, itemsPerPage, isAllView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivateUser = async (userId: number) => {
    setConfirmAction({
      type: 'deactivate',
      userId,
    });
    setConfirmDialogOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    setConfirmAction({
      type: 'delete',
      userId,
    });
    setConfirmDialogOpen(true);
  };

  const confirmUserAction = async () => {
    if (!confirmAction) return;

    try {
      setLoading(true);
      await deleteUser(confirmAction.userId, confirmAction.type);
      toast.success(
        confirmAction.type === 'delete'
          ? 'User deleted successfully'
          : 'User deactivated successfully'
      );
      await fetchData();
    } catch (error) {
      console.error(`Failed to ${confirmAction.type} user:`, error);
      const message = error instanceof Error ? error.message : `Failed to ${confirmAction.type} user`;
      toast.error(message);
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
      setConfirmAction(null);
    }
  };

  const handleRetry = () => {
    fetchData(0);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    console.log('📏 Items per page changed to:', newItemsPerPage);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'ID',
      accessor: 'id',
      cell: (row) => row.id || '-',
    },
    {
      header: 'Username',
      accessor: 'user_name',
      cell: (row) => row.user_name || '-',
    },
    {
      header: 'Full Name',
      accessor: 'first_name',
      cell: (row) => row.first_name || '-',
      priority: 1, // Always show
    },
    {
      header: 'Last Name',
      accessor: 'last_name',
      cell: (row) => row.last_name || '-',
      priority: 1, // Always show
    },
    {
      header: 'Email',
      accessor: 'email',
      cell: (row) => row.email || '-',
      priority: 2, // Mobile+
    },
    {
      header: 'Username',
      accessor: 'user_name',
      cell: (row) => row.user_name || '-',
      priority: 3, // Tablet+
    },
    {
      header: 'Phone',
      accessor: 'phone',
      cell: (row) => {
        const phone = row.phone_number || row.phone;
        return phone || '-';
      },
      priority: 3, // Tablet+
    },
    {
      header: 'Account Type',
      accessor: 'account_type',
      cell: (row) => row.account_type || '-',
    },
    {
      header: 'Is Active',
      accessor: 'is_active',
      cell: (row) => {
        let isActive = false;

        try {
          if (typeof row.is_active === 'string') {
            isActive = row.is_active.toLowerCase() === 'active';
          } else if (typeof row.is_active === 'number') {
            isActive = row.is_active === 1;
          } else if (typeof row.is_active === 'boolean') {
            isActive = row.is_active;
          }
        } catch (err) {
          console.error('Error parsing is_active:', err);
        }

        return (
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
      priority: 2, // Mobile+
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      cell: (row) => {
        try {
          return row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : '-';
        } catch (err) {
          console.error('Error formatting date:', err);
          return '-';
        }
      },
      priority: 4, // Desktop only
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => {
        const isActive = typeof row.is_active === 'string'
          ? row.is_active.toLowerCase() === 'active'
          : row.is_active === 1;

        return (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={isAllView ? '#' : `/users/edit/${row.id}`} onClick={isAllView ? (e) => e.preventDefault() : undefined}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3" disabled={isAllView || !can('user.edit')} title={isAllView ? "Edit is disabled in All-Accounts view" : ""}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Edit user</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {(can('user.delete') || can('user.edit')) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 lg:px-3" disabled={isAllView} title={isAllView ? "Actions disabled in All-Accounts view" : ""}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Only show Deactivate option for active users */}
                {can('user.edit') && isActive ? (
                  <DropdownMenuItem
                    onClick={() => handleDeactivateUser(row.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <PowerOff className="h-4 w-4 mr-2" />
                    Deactivate User
                  </DropdownMenuItem>
                ) : null}
                {can('user.delete') && !isActive ? (
                  // Inactive users only have Delete option
                  <DropdownMenuItem
                    onClick={() => handleDeleteUser(row.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                ) : null}

                {/* Show separator and Delete for active users only */}
                {can('user.delete') && isActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteUser(row.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        );
      },
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const userCardConfig: CardConfig<AdminUser> = {
    title: (user) => `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
    subtitle: (user) => user.email || '-',
    primaryMetric: {
      field: 'user_name',
      label: 'Username',
    },
    secondaryMetrics: [
      {
        field: 'phone',
        label: 'Phone',
        format: (val) => {
          const user = val as any;
          return user?.phone || user?.phone_number || '-';
        }
      },
      {
        field: 'is_active',
        label: 'Status',
        format: (val) => {
          if (typeof val === 'string') return val.toLowerCase() === 'active' ? 'Active' : 'Inactive';
          if (typeof val === 'number') return val === 1 ? 'Active' : 'Inactive';
          return val ? 'Active' : 'Inactive';
        }
      },
    ],
    statusField: 'is_active',
    statusColors: {
      'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      '1': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'true': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'inactive': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      '0': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'false': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    actions: (user) => {
      const isActive = typeof user.is_active === 'string'
        ? user.is_active.toLowerCase() === 'active'
        : user.is_active === 1;

      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {can('user.edit') && (
          <Link href={isAllView ? '#' : `/users/edit/${user.id}`} className="flex-1" onClick={isAllView ? (e) => e.preventDefault() : undefined}>
            <Button variant="outline" className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl" disabled={isAllView} title={isAllView ? "Edit is disabled in All-Accounts view" : ""}>
              <Edit className="h-5 w-5" />
            </Button>
          </Link>
          )}
          {(can('user.delete') || can('user.edit')) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto h-14 min-h-[56px] text-base font-semibold rounded-xl" disabled={isAllView} title={isAllView ? "Actions disabled in All-Accounts view" : ""}>
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {can('user.edit') && isActive ? (
                <DropdownMenuItem
                  onClick={() => handleDeactivateUser(user.id)}
                  className="text-destructive font-medium"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Deactivate User
                </DropdownMenuItem>
              ) : null}
              {can('user.delete') && !isActive ? (
                <DropdownMenuItem
                  onClick={() => handleDeleteUser(user.id)}
                  className="text-destructive font-medium"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </DropdownMenuItem>
              ) : null}
              {can('user.delete') && isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-destructive font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      );
    },
  };

  if (error && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary">Users Management</h1>
          {can('user.create') && (
          <Link href={isAllView ? '#' : '/users/create'} className="w-full sm:w-auto" onClick={isAllView ? (e) => e.preventDefault() : undefined}>
            <Button className="w-full sm:w-auto min-h-[44px]" disabled={isAllView} title={isAllView ? "Create is disabled in All-Accounts view" : ""}>Create User</Button>
          </Link>
          )}
        </div>

        <div className="flex items-center justify-center p-8 border rounded-lg bg-red-50">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Users Management</h1>
        {can('user.create') && (
        <Link href={isAllView ? '#' : '/users/create'} className="w-full sm:w-auto" onClick={isAllView ? (e) => e.preventDefault() : undefined}>
          <Button className="w-full sm:w-auto min-h-[44px]" disabled={isAllView} title={isAllView ? "Create is disabled in All-Accounts view" : ""}>Create User</Button>
        </Link>
        )}
      </div>

      <UsersToolbar
        search={search}
        onSearchChange={setSearch}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onClearFilters={handleClearFilters}
      />

      <Table
        data={users}
        columns={columns}
        currentPage={currentPage}
        totalPages={Math.max(1, Math.ceil(totalEntries / itemsPerPage))}
        totalEntries={totalEntries}
        showingFrom={totalEntries > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, totalEntries) : 0}
        showingTo={Math.min(currentPage * itemsPerPage, totalEntries)}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        loading={loading}
        cardConfig={userCardConfig}
        tableName="users"
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete' ? 'Delete User' : 'Deactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete'
                ? 'Are you sure you want to permanently delete this user? This action cannot be undone.'
                : 'Are you sure you want to deactivate this user?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUserAction}
              className={confirmAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmAction?.type === 'delete' ? 'Delete' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}