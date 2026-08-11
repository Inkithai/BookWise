// components/invoice/clients/InvoiceClientTable.tsx
"use client"

import * as React from "react"
import { Eye, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { useAppDispatch } from "@/slices/hooks"
import { setAuthUser, setFullUser } from "@/slices/authSlice"
import { Table, Column, CardConfig } from "@/components/elements/Table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getInvoiceClients, deleteInvoiceClient } from "@/services/invoice.service"
import { Client, isBusinessClient } from "@/services/interface/invoice"
import { getCurrentUser, switchAccountContext } from "@/services/service"
import { getViewScope, ViewScope } from "@/utils/view-scope"
import { usePermissions } from '@/utils/permissions'

interface ApiError {
  message?: string;
}

export function InvoiceClientTable() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const [data, setData] = React.useState<Client[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [clientToDelete, setClientToDelete] = React.useState<number | null>(null);
  const [availableCompanies, setAvailableCompanies] = React.useState<Array<{ id: number; host_id?: number; company_name?: string | null }>>([]);
  const [viewScope, setViewScopeState] = React.useState<ViewScope>("current");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => setViewScopeState(getViewScope());
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  const isAllView = viewScope === "all";

  const loadClientsData = React.useCallback(async () => {
    try {
      setLoading(true);
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;

      const companies = (Array.isArray(me?.available_companies) ? me.available_companies : [])
        .map((company: any) => ({
          id: Number(company?.id ?? company?.company_id),
          host_id: Number(company?.host_id),
          company_name: company?.company_name || company?.name || '',
        }))
        .filter((company: any) => Number.isFinite(company.id) && company.id > 0);
      setAvailableCompanies(companies);

      const originalType: 'personal' | 'company' =
        me?.current_context?.type === 'company' ? 'company' : 'personal';
      const originalCompanyIdRaw = Number(me?.current_context?.company_id ?? me?.active_company_id);
      const originalCompanyId = Number.isFinite(originalCompanyIdRaw) && originalCompanyIdRaw > 0
        ? originalCompanyIdRaw
        : null;

      const viewScope = getViewScope();
      let clients: Client[] = [];

      if (viewScope === 'all') {
        // "All" scope: fetch from every context and merge
        const merged: Client[] = [];
        const seen = new Set<string>();
        const pushUnique = (rows: Client[]) => {
          rows.forEach((client) => {
            const key = `${client.id}-${client.host_id ?? 'personal'}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(client);
            }
          });
        };

        try {
          await switchAccountContext({ type: "personal" });
          pushUnique(await getInvoiceClients());

          for (const company of companies) {
            await switchAccountContext({ type: "company", company_id: company.id });
            pushUnique(await getInvoiceClients());
          }
        } finally {
          if (originalType === 'company' && originalCompanyId) {
            await switchAccountContext({ type: 'company', company_id: originalCompanyId });
          } else {
            await switchAccountContext({ type: 'personal' });
          }
        }
        clients = merged;
      } else {
        // "Current" scope: only fetch for the active context
        // The backend already scopes by the active session context
        clients = await getInvoiceClients();
      }

      const latestMe = await getCurrentUser();
      const userData = (latestMe as any)?.data ?? latestMe;
      if (userData?.id) {
        dispatch(setAuthUser(userData));
        dispatch(setFullUser(userData));
      }

      setData(clients);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error("Failed to load clients: " + (apiError.message || "Unknown error"));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  React.useEffect(() => {
    loadClientsData();
  }, [loadClientsData]);

  // Re-fetch clients when account context changes (personal company switch)
  React.useEffect(() => {
    const handleContextChange = () => {
      setData([]);
      loadClientsData();
    };
    window.addEventListener('account-context-changed', handleContextChange);
    return () => window.removeEventListener('account-context-changed', handleContextChange);
  }, [loadClientsData]);

  // Re-fetch clients when view scope changes (current all)
  React.useEffect(() => {
    const handleScopeChange = () => {
      setData([]);
      loadClientsData();
    };
    window.addEventListener('viewScopeChanged', handleScopeChange as any);
    return () => window.removeEventListener('viewScopeChanged', handleScopeChange as any);
  }, [loadClientsData]);

  const handleView = (client: Client) => {
    const query = buildClientContextQuery(client);
    router.push(`/invoice/clients/${client.id}${query}`);
  };

  const handleEdit = (client: Client) => {
    const query = buildClientContextQuery(client);
    router.push(`/invoice/clients/${client.id}/edit${query}`);
  };

  const buildClientContextQuery = (client: Client): string => {
    const hostId = Number(client.host_id);
    if (Number.isFinite(hostId) && hostId > 0) {
      const company = availableCompanies.find((c) => Number(c.host_id) === hostId);
      if (company?.id) {
        return `?context=company&company_id=${company.id}`;
      }
    }
    return `?context=personal`;
  };

  const handleDelete = async (id: number) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      await deleteInvoiceClient(clientToDelete);
      setData(data.filter((client) => client.id !== clientToDelete));
      toast.success("Client deleted successfully");
    } catch (error: unknown) {
      const apiError = error as ApiError;
      toast.error("Failed to delete client: " + (apiError.message || "Unknown error"));
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleCreate = () => {
    router.push("/invoice/clients/create");
  };

  const filteredData = React.useMemo(() => {
    let result = data;

    // Apply text search filter
    if (globalFilter) {
      const search = globalFilter.toLowerCase();
      result = result.filter((client) => {
        return (
          client.name?.toLowerCase().includes(search) ||
          client.email?.toLowerCase().includes(search) ||
          client.telephone?.toLowerCase().includes(search) ||
          // Search all address fields
          (client.address_no?.toLowerCase().includes(search) ||
            client.address_street?.toLowerCase().includes(search) ||
            client.address_city?.toLowerCase().includes(search) ||
            client.address_town?.toLowerCase().includes(search) ||
            client.address_postcode?.toLowerCase().includes(search) ||
            client.address_county?.toLowerCase().includes(search) ||
            client.address_country?.toLowerCase().includes(search) ||
            client.address?.toLowerCase().includes(search)) ||
          client.client_type?.toLowerCase().includes(search)
        );
      });
    }

    return result;
  }, [data, globalFilter]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  const onItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const columns: Column<Client>[] = [
    {
      header: "Name",
      accessor: "name",
      priority: 1, // Always show
    },
    {
      header: "Email",
      accessor: "email",
      priority: 2, // Mobile+
    },
    {
      header: "Phone",
      accessor: "telephone",
      priority: 2, // Mobile+
    },
    {
      header: "Type",
      accessor: "client_type",
      cell: (row: Client) => {
        const type = row.client_type || "Personal";
        return (
          <Badge variant={isBusinessClient(row) ? "default" : "secondary"}>
            {type}
          </Badge>
        );
      },
      priority: 3, // Tablet+
    },
    {
      header: "Address",
      accessor: "address",
      cell: (row: Client) => {
        // Format address from separate fields
        const formatAddress = (client: Client) => {
          const parts = [];

          if (client.address_no || client.address_street) {
            const streetLine = [client.address_no, client.address_street].filter(Boolean).join(' ');
            parts.push(streetLine);
          }

          const cityLine = [client.address_city, client.address_town, client.address_county].filter(Boolean).join(', ');
          if (cityLine) parts.push(cityLine);

          if (client.address_postcode) parts.push(client.address_postcode);
          if (client.address_country) parts.push(client.address_country);

          // Fallback to old address field if new fields are empty
          if (parts.length === 0 && client.address) {
            return client.address;
          }

          return parts.join(', ');
        };

        const address = formatAddress(row);

        const content = (
          <div
            className="w-[250px] whitespace-normal break-words"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {address || "-"}
          </div>
        );

        if (!address) return content;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent className="max-w-none w-auto whitespace-normal break-words">
                <div style={{ whiteSpace: 'pre-line' }}>
                  {address}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      priority: 4, // Desktop only
    },

    {
      header: "Utr Number",
      accessor: "utr",
      priority: 4, // Desktop only
    },
    {
      header: "Actions",
      accessor: "id",
      cell: (row: Client) => (
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleView(row)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(row)}
                  disabled={isAllView || !can('invoice-client.edit')}
                  title={isAllView ? "Edit is disabled in All-Accounts view" : ""}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {can('invoice-client.delete') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(row.id!)}
                    className="text-red-600 hover:text-red-700"
                    disabled={isAllView}
                    title={isAllView ? "Delete is disabled in All-Accounts view" : ""}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
      priority: 1, // Always show
    },
  ];

  // Card configuration for mobile view
  const clientCardConfig: CardConfig<Client> = {
    title: (client) => client.name || 'Unknown Client',
    subtitle: (client) => client.email || '-',
    primaryMetric: {
      field: 'telephone',
      label: 'Phone',
      format: (val) => val || '-',
    },
    secondaryMetrics: [
      {
        field: 'client_type',
        label: 'Type',
        format: (val) => val || 'Personal'
      },
      {
        field: 'utr',
        label: 'UTR Number',
        format: (val) => val || '-'
      },
    ],
    statusField: 'client_type',
    statusColors: {
      'business': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      'personal': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    },
    actions: (client) => (
      <div className="flex gap-3">
        <Button
          className="flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl"
          onClick={() => handleView(client)}
        >
          <Eye className="h-5 w-5 mr-2" />
          View
        </Button>
        {can('invoice-client.edit') && (
          <Button
            variant="outline"
            className="h-14 w-14 min-h-[56px] rounded-xl"
            onClick={() => handleEdit(client)}
            disabled={isAllView}
            title={isAllView ? "Edit is disabled in All-Accounts view" : ""}
          >
            <Edit className="h-5 w-5" />
          </Button>
        )}
      </div>
    ),
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading clients...</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Invoice Clients</h1>
        <Button onClick={handleCreate} variant="default" disabled={isAllView || !can('invoice-client.create')} title={isAllView ? "Create is disabled in All-Accounts view" : ""}>
          {/* <Plus className="mr-2 h-4 w-4" /> */}
          + Create Client
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search clients..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">Rows per page</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table
        data={paginatedData}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={onPageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
        loading={loading}
        cardConfig={clientCardConfig}
        tableName="invoice-clients"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
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
    </div>
  );
}