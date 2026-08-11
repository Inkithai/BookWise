// components/invoice/InvoiceTable.tsx - FULL UPDATED VERSION
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Table } from "@/components/elements/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RootState, AppDispatch } from "@/slices/store";
import {
  getInvoices,
  deleteInvoice,
  getInvoiceTypes,
  getInvoiceClients,
  generateInvoicePDF,
  generateInvoiceReceiptPDF,
  downloadBlob,
  updateInvoice
} from "@/services/invoice.service";
import {
  setInvoices,
  setLoading,
  setError,
  deleteInvoice as deleteInvoiceFromState,
  setInvoiceTypes,
  setClients,
  updateInvoice as updateInvoiceInState
} from "@/slices/invoiceSlice";
import { Invoice, InvoiceType, Client, formatCurrency, DEFAULT_CURRENCY, InvoiceStatus, UpdateInvoiceRequest } from "@/services/interface/invoice";
import { Eye, Edit, Download, Mail, Trash2, Plus, Search, FileText, Receipt, Loader2, Building2 } from "lucide-react";
import { usePermissions } from '@/utils/permissions';
import { getCurrentUser, switchAccountContext } from "@/services/service";
import { toast } from "sonner";
import { MailDialog } from "./MailDialog";
import DeleteInvoicePopup from "./InvoiceDeletePopup";
import { getViewScope } from "@/utils/view-scope";

// Helper functions for invoice type handling
const getInvoiceTypeNameFromInvoice = (invoice: Invoice, invoiceTypes: InvoiceType[]): string => {
  if (invoice.type_id && invoiceTypes.length > 0) {
    const type = invoiceTypes.find((t: InvoiceType) => t.id === invoice.type_id);
    if (type) return type.name;
  }

  if (invoice.invoice_type) {
    return invoice.invoice_type;
  }

  return "N/A";
};

const getClientName = (invoice: Invoice, clients: Client[]): string => {
  if (typeof invoice.client === "string") {
    return invoice.client;
  }

  if (invoice.client_object && typeof invoice.client_object === "object") {
    return (invoice.client_object as Client).name || "N/A";
  }

  if (invoice.client_id && clients.length > 0) {
    const client = clients.find((c: Client) => c.id === invoice.client_id);
    return client?.name || "N/A";
  }

  return "N/A";
};

const getPrimaryCurrency = (invoice: Invoice): string => {
  if (invoice.items && invoice.items.length > 0) {
    return invoice.items[0].currency || DEFAULT_CURRENCY;
  }
  return DEFAULT_CURRENCY;
};

// Status options for quick update
const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "Created", label: "Created" },
  { value: "Mail Sent", label: "Mail Sent" },
  { value: "Rejected", label: "Rejected" },
  { value: "Paid", label: "Paid" },
  { value: "Installment Payment", label: "Installment Payment" },
  { value: "Not Paid", label: "Not Paid" },
  { value: "Receipt Sent", label: "Receipt Sent" },
  { value: "Draft", label: "Draft" }
];

export function InvoiceTable() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { invoices, loading, invoiceTypes, clients } = useSelector((state: RootState) => state.invoice);
  const { can, isSubUser } = usePermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<{ [key: number]: string | null }>({});
  const [updatingStatus, setUpdatingStatus] = useState<{ [key: number]: boolean }>({});
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<number | null>(null);
  const [deleteInvoiceCode, setDeleteInvoiceCode] = useState<string | undefined>();
  // Sorting state
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [open, setOpen] = useState(false);

  // Company context filter
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: number; host_id?: number; company_name?: string | null; is_active?: boolean }>>([]);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [activeContextValue, setActiveContextValue] = useState<string>("personal");
  const [activeContextLabel, setActiveContextLabel] = useState<string>("Personal / Default");
  const [personalFilterLabel, setPersonalFilterLabel] = useState<string>("Personal");
  const [companyFilterLoading, setCompanyFilterLoading] = useState(false);
  const [currentContextType, setCurrentContextType] = useState<"personal" | "company">("personal");
  const [currentContextCompanyId, setCurrentContextCompanyId] = useState<number | null>(null);
  const [personalHostId, setPersonalHostId] = useState<number | null>(null);
  const [viewScope, setViewScopeState] = useState<"current" | "all">("current");
  const initialLoadCompletedRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const activeLoadSignatureRef = useRef<string | null>(null);
  const lastLoadSignatureRef = useRef<string | null>(null);
  const lastLoadStartedAtRef = useRef(0);

  const canMutateInvoiceInCurrentContext = (invoice: Invoice): boolean => {
    const invoiceCompanyRaw = Number(invoice.company_id);
    const invoiceCompanyId =
      Number.isFinite(invoiceCompanyRaw) && invoiceCompanyRaw > 0 ? invoiceCompanyRaw : null;
    const isPersonalScopedInvoice =
      !!invoiceCompanyId && !!personalHostId && invoiceCompanyId === personalHostId;

    // Sub-users are forced into company context by the backend but operate under
    // the parent's host. When no specific active company is set, allow mutating
    // any invoice scoped to their shared host (personalHostId).
    if (isSubUser && !currentContextCompanyId) {
      return isPersonalScopedInvoice || !invoiceCompanyId;
    }

    if (invoiceCompanyId && !isPersonalScopedInvoice) {
      return currentContextType === "company" && currentContextCompanyId === invoiceCompanyId;
    }

    return currentContextType === "personal";
  };

  const loadAllData = useCallback(async () => {
    const scope = getViewScope();
    const signature = `${scope}`;
    const now = Date.now();

    // Skip exact duplicate calls while one is already running.
    if (activeLoadSignatureRef.current === signature) return;

    // Skip immediate back-to-back duplicate calls triggered by cascading effects/events.
    if (
      lastLoadSignatureRef.current === signature &&
      now - lastLoadStartedAtRef.current < 300
    ) {
      return;
    }

    activeLoadSignatureRef.current = signature;
    lastLoadSignatureRef.current = signature;
    lastLoadStartedAtRef.current = now;

    const requestId = ++loadRequestIdRef.current;
    try {
      dispatch(setLoading(true));

      const [typesData, clientsData, userData] = await Promise.all([
        getInvoiceTypes(),
        getInvoiceClients(),
        getCurrentUser().catch(() => null),
      ]);

      const rawUser = (userData as any)?.data ?? userData ?? null;

      const originalType =
        rawUser?.current_context?.type === "company" || rawUser?.active_context_type === "company"
          ? "company"
          : "personal";
      const originalCompanyId = Number(rawUser?.current_context?.company_id ?? rawUser?.active_company_id);
      const originalCompany = Number.isFinite(originalCompanyId) && originalCompanyId > 0 ? originalCompanyId : null;
      const rawPersonalHostId = Number(
        rawUser?.personal_company_id ??
        rawUser?.host_id ??
        (rawUser?.current_context?.type === "personal" ? rawUser?.current_context?.host_id : null) ??
        rawUser?.id
      );
      const resolvedPersonalHostId =
        Number.isFinite(rawPersonalHostId) && rawPersonalHostId > 0 ? rawPersonalHostId : null;
      setCurrentContextType(originalType);
      setCurrentContextCompanyId(originalCompany);
      setPersonalHostId(resolvedPersonalHostId);

      let invoicesData: Invoice[];

      if (scope === 'all' && rawUser) {
        // All-Accounts View: fetch from personal + all linked companies
        const rawCompanies = Array.isArray(rawUser?.available_companies) ? rawUser.available_companies : [];
        const companies = rawCompanies
          .map((company: any) => ({
            id: Number(company?.id ?? company?.company_id),
            company_name: company?.company_name ?? company?.name ?? null,
          }))
          .filter((company: any) => Number.isFinite(company.id) && company.id > 0);
        setAvailableCompanies(companies);

        const restoreOriginalContext = async () => {
          if (originalType === "company" && originalCompany) {
            await switchAccountContext({ type: "company", company_id: originalCompany });
          } else {
            await switchAccountContext({ type: "personal" });
          }
        };

        const merged: Invoice[] = [];
        const seen = new Set<string>();
        const pushUnique = (rows: Invoice[]) => {
          rows.forEach((row) => {
            const key = `${row.id}-${row.company_id ?? "personal"}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(row);
            }
          });
        };

        try {
          // Fetch personal invoices
          try {
            await switchAccountContext({ type: "personal" });
            pushUnique(await getInvoices());
          } catch (e) {
            console.warn("Context switch to personal failed; skipping personal invoices.", e);
          }

          // Fetch each company's invoices
          for (const company of companies) {
            try {
              await switchAccountContext({ type: "company", company_id: company.id });
              pushUnique(await getInvoices());
            } catch (e) {
              console.warn(`Context switch failed for company ${company.id}; continuing with fallback resolution.`, e);
            }
          }
        } finally {
          await restoreOriginalContext();
        }

        invoicesData = merged;
      } else {
        // Current context only
        invoicesData = await getInvoices();

        // Filter invoices to current context.
        // NOTE: For sub-users, originalType may be 'company' but originalCompany (active_company_id)
        // may be null — in that case the backend already scoped by host_id, so show all returned invoices.
        invoicesData = invoicesData.filter((invoice) => {
          const invoiceCompanyRaw = Number(invoice.company_id);
          const invoiceCompanyId =
            Number.isFinite(invoiceCompanyRaw) && invoiceCompanyRaw > 0 ? invoiceCompanyRaw : null;

          if (originalType === "company") {
            // If we have a specific active company, filter to it.
            // If no active company (sub-user case), show everything — backend already scoped correctly.
            if (originalCompany) {
              return !!invoiceCompanyId && invoiceCompanyId === originalCompany;
            }
            return true;
          }

          // Personal context: match by host_id (new field) or legacy company_id.
          // Pre-migration invoices may have company_id != host_id, so check both.
          const invoiceHostId = Number.isFinite(Number((invoice as any).host_id)) && Number((invoice as any).host_id) > 0
            ? Number((invoice as any).host_id) : null;
          if (!invoiceCompanyId && !invoiceHostId) return true;
          if (resolvedPersonalHostId) {
            return invoiceHostId === resolvedPersonalHostId || invoiceCompanyId === resolvedPersonalHostId;
          }
          return true;
        });
      }

      const sortedInvoices = [...invoicesData].sort((a, b) => b.id - a.id);
      if (requestId !== loadRequestIdRef.current) return;

      dispatch(setInvoices(sortedInvoices));
      dispatch(setInvoiceTypes(typesData));
      dispatch(setClients(clientsData));

    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      dispatch(setError(errorMessage));
      console.error("Failed to load data:", error);
      toast.error("Failed to load invoices");
    } finally {
      if (activeLoadSignatureRef.current === signature) {
        activeLoadSignatureRef.current = null;
      }
      if (requestId !== loadRequestIdRef.current) return;
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const scope = getViewScope();
      setViewScopeState(scope);
      if (scope !== 'all') setAccountFilter('all');
    };
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  // Load invoices on first mount
  useEffect(() => {
    if (initialLoadCompletedRef.current) return;
    initialLoadCompletedRef.current = true;
    loadAllData();
  }, []);

  useEffect(() => {
    const onScopeChange = () => {
      lastLoadSignatureRef.current = '';
      activeLoadSignatureRef.current = '';
      loadAllData();
    };
    window.addEventListener("viewScopeChanged", onScopeChange as any);
    return () => window.removeEventListener("viewScopeChanged", onScopeChange as any);
  }, [loadAllData]);

  useEffect(() => {
    const handleContextChange = () => {
      lastLoadSignatureRef.current = '';
      activeLoadSignatureRef.current = '';
      loadAllData();
    };
    window.addEventListener('account-context-changed', handleContextChange);
    return () => window.removeEventListener('account-context-changed', handleContextChange);
  }, [loadAllData]);

  // Apply URL status filter from /invoices?status=...
  useEffect(() => {
    const raw = searchParams?.get("status");
    const normalized = raw ? decodeURIComponent(raw).trim() : "";
    const allowed = new Set(STATUS_OPTIONS.map((s) => s.value));
    if (normalized && allowed.has(normalized as InvoiceStatus)) {
      setStatusFilter(normalized as InvoiceStatus);
      setCurrentPage(1);
      return;
    }
    setStatusFilter("");
  }, [searchParams]);

  // Handle sorting
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleDownloadPDF = async (invoice: Invoice, type: "invoice" | "receipt" = "invoice") => {
    const loadingKey = `${type}-${invoice.id}`;

    try {
      setDownloadingPdf(prev => ({ ...prev, [invoice.id]: type }));

      toast.loading(`Generating ${type} PDF...`, { id: loadingKey });

      let blob: Blob;
      if (type === "invoice") {
        blob = await generateInvoicePDF(invoice.id, invoice.company_id);
      } else {
        blob = await generateInvoiceReceiptPDF(invoice.id, invoice.company_id);
      }

      if (!blob || blob.size === 0) {
        throw new Error("Received empty or invalid PDF file");
      }

      const filename = `${type}-${invoice.code || `inv-${invoice.id}`}.pdf`;
      downloadBlob(blob, filename);

      toast.success(`${type === "invoice" ? "Invoice" : "Receipt"} PDF downloaded successfully!`, {
        id: loadingKey
      });

    } catch (error) {
      console.error(`Failed to generate ${type} PDF:`, error);

      let errorMessage = `Failed to generate ${type} PDF`;

      if (error instanceof Error) {
        if ("response" in error && typeof error.response === "object" && error.response !== null) {
          const response = error.response as { data?: { message?: string } };
          if (response.data?.message) {
            errorMessage = response.data.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, { id: loadingKey });
    } finally {
      setDownloadingPdf(prev => {
        const newState = { ...prev };
        delete newState[invoice.id];
        return newState;
      });
    }
  };

  // Handle quick status update - FIXED VERSION
  const handleQuickStatusUpdate = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    if (invoice.status === newStatus) return;
    if (!canMutateInvoiceInCurrentContext(invoice)) {
      toast.error("Switch to the invoice owner account to edit status");
      return;
    }

    try {
      setUpdatingStatus(prev => ({ ...prev, [invoice.id]: true }));
      
      // Get current invoice from Redux store
      const currentInvoice = invoices.find(inv => inv.id === invoice.id);

      const currentInvoiceClient = clients.find(client => client.name === currentInvoice?.client)?.id;

      if (!currentInvoice) {
        throw new Error("Invoice not found in current data");
      }

      // Check if invoice has invoice code
      if (!currentInvoice.code || currentInvoice.code.length === 0) {
        toast.error("Invoice has no invoice number. Please edit invoice first to add invoice number.");
        return;
      }
      if (!currentInvoice.client || currentInvoice.client.length === 0) {
        toast.error("Invoice has no client. Please edit invoice first to add client.");
        return;
      }
      // Check if invoice has items
      if (!currentInvoice.items || currentInvoice.items.length === 0) {
        toast.error("Invoice has no items. Please edit invoice first to add items.");
        return;
      }

      // Prepare items for API - ensure all required fields are present
      const itemsPayload = currentInvoice.items.map((item, index) => {
        // Ensure all required fields have values
        const itemPrice = parseFloat(item.price?.toString() || "0");
        const itemQuantity = item.type === "product" ? parseFloat(item.quantity?.toString() || "1") : 1;
        const itemDiscount = item.discount ? parseFloat(item.discount.toString()) : 0;
        const itemVat = item.vat ? parseFloat(item.vat.toString()) : 0;

        // Calculate derived values if not present
        const subtotal = itemPrice * itemQuantity;
        const discountAmount = subtotal * (itemDiscount / 100);
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * (itemVat / 100);
        const totalAmount = afterDiscount + vatAmount;

        return {
          name: item.name || `Item ${index + 1}`,
          type: item.type || "service",
          currency: item.currency || DEFAULT_CURRENCY,
          price: itemPrice,
          quantity: itemQuantity,
          discount: itemDiscount || 0,
          discount_value: discountAmount,
          vat: itemVat || 0,
          vat_value: vatAmount,
          total_amount: totalAmount
        };
      });

      // Get fallback client and type IDs if missing
      const fallbackClientId = clients.length > 0 ? clients[0].id : 1;
      const fallbackTypeId = invoiceTypes.length > 0 ? invoiceTypes[0].id : 1;

      // Fetch current user bank details if needed for bank_payment validation
      let bankDetails: { account_name?: string | null; account_number?: string | null; sort_code?: string | null } = {};
      if (currentInvoice.bank_payment) {
        try {
          const meResponse = await getCurrentUser();
          const me = (meResponse as any)?.data ?? meResponse;
          const bank = me?.bank ?? null;
          if (bank?.account_name && bank?.account_number && bank?.sort_code) {
            bankDetails = {
              account_name: bank.account_name,
              account_number: bank.account_number,
              sort_code: bank.sort_code,
            };
          }
        } catch {
          // ignore, let backend validate
        }
      }

      // Prepare complete payload with ALL required fields
      const payload = {
        status: newStatus,
        invoice_code: currentInvoice.code,
        company_id: currentInvoice.company_id ?? null,
        client_id: currentInvoice.client_id || currentInvoiceClient || fallbackClientId,
        type_id: currentInvoice.type_id || fallbackTypeId,
        invoice_date: currentInvoice.invoice_date || new Date().toISOString().split('T')[0],
        due_date: currentInvoice.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: itemsPayload,
        total_amount: currentInvoice.total_amount ||
          itemsPayload.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
        total_vat: currentInvoice.total_vat ||
          itemsPayload.reduce((sum, item) => sum + (item.vat_value || 0), 0),
        total_discount: currentInvoice.total_discount ||
          itemsPayload.reduce((sum, item) => sum + (item.discount_value || 0), 0),
        final_amount: currentInvoice.final_amount ||
          itemsPayload.reduce((sum, item) => sum + item.total_amount, 0),
        pdf_type: currentInvoice.pdf_type || 'classic',
        payment_link: Boolean(currentInvoice.payment_link),
        bank_payment: Boolean(currentInvoice.bank_payment),
        ...(currentInvoice.bank_payment && bankDetails.account_name ? bankDetails : {}),
      };

      console.log("📦 Sending complete update payload:", {
        status: payload.status,
        itemsCount: payload.items.length,
        client_id: payload.client_id,
        type_id: payload.type_id,
        total_amount: payload.total_amount,
        final_amount: payload.final_amount
      });

      const updatedInvoice = await updateInvoice(invoice.id, payload as UpdateInvoiceRequest);

      // Update in Redux store
      dispatch(updateInvoiceInState(updatedInvoice));

      toast.success(`Status updated to ${newStatus}`);

    } catch (error: any) {
      console.error("Failed to update status:", error);

      // Show user-friendly error message
      let errorMessage = "Failed to update status";

      if (error.message.includes("items field must have at least 1 items")) {
        errorMessage = "Cannot update: Invoice has no items. Please edit invoice first to add items.";
      } else if (error.message.includes("client_id and type_id are required")) {
        errorMessage = "Cannot update: Missing client or invoice type information.";
      } else if (error.message.includes("Validation failed")) {
        // Parse validation errors
        if (error.message.includes("items")) {
          errorMessage = "Cannot update: Invoice items data is incomplete.";
        } else {
          errorMessage = error.message;
        }
      } else if (error.message.includes("Required data missing")) {
        errorMessage = "Cannot update: Invoice data is incomplete. Please edit invoice first.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);

      // Reload data to ensure UI is in sync
      loadAllData();
    } finally {
      setUpdatingStatus(prev => {
        const newState = { ...prev };
        delete newState[invoice.id];
        return newState;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteInvoiceId) {
      return;
    }

    try {
      const targetInvoice = invoices.find((invoice) => {
        if (invoice.id !== deleteInvoiceId) return false;
        if (!deleteInvoiceCode) return true;
        return invoice.code === deleteInvoiceCode;
      });
      if (targetInvoice && !canMutateInvoiceInCurrentContext(targetInvoice)) {
        toast.error("Switch to the invoice owner account to delete this invoice");
        setOpen(false);
        return;
      }
      await deleteInvoice(deleteInvoiceId);
      dispatch(deleteInvoiceFromState(deleteInvoiceId));
      toast.success("Invoice deleted");
      setOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      dispatch(setError(errorMessage));
      console.error("Failed to delete invoice:", error);
      toast.error("Failed to delete invoice");
      setOpen(false)
    }
  };

  // Sort and filter invoices
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply account filter (only in ALL view)
    if (viewScope === 'all' && accountFilter !== 'all') {
      if (accountFilter === 'personal') {
        filtered = filtered.filter((invoice) => {
          const invCompany = Number(invoice.company_id);
          return !Number.isFinite(invCompany) || invCompany <= 0 || invCompany === personalHostId;
        });
      } else {
        const filterCompanyId = Number(accountFilter);
        if (Number.isFinite(filterCompanyId) && filterCompanyId > 0) {
          filtered = filtered.filter((invoice) => Number(invoice.company_id) === filterCompanyId);
        }
      }
    }

    // Apply status filter (from URL or UI)
    if (statusFilter) {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((invoice) => {
        const code = invoice.code?.toLowerCase() || "";
        const clientName = getClientName(invoice, clients).toLowerCase();
        const typeName = getInvoiceTypeNameFromInvoice(invoice, invoiceTypes).toLowerCase();
        const status = invoice.status?.toLowerCase() || "";
        const createdBy = invoice.created_by?.toLowerCase() || "";
        const totalAmount = invoice.total_amount?.toString() || "";
        const finalAmount = invoice.final_amount?.toString() || "";

        return (
          code.includes(query) ||
          clientName.includes(query) ||
          typeName.includes(query) ||
          status.includes(query) ||
          createdBy.includes(query) ||
          totalAmount.includes(query) ||
          finalAmount.includes(query)
        );
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      // Navigate to nested properties if needed
      const aFields = sortField.split('.');
      const bFields = sortField.split('.');

      aFields.forEach(field => {
        aValue = aValue?.[field];
      });

      bFields.forEach(field => {
        bValue = bValue?.[field];
      });

      // Handle different data types for sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Default numeric/boolean comparison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [invoices, statusFilter, searchQuery, clients, invoiceTypes, sortField, sortDirection, viewScope, accountFilter, personalHostId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, itemsPerPage, sortField, sortDirection, accountFilter]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  const handleCompanyFilterChange = async (_value: string) => {
    // No-op: company filter dropdown removed. Kept to avoid breaking imports if referenced elsewhere.
  };

  const handleItemsPerPageChangeNumber = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const columns = [
    {
      header: "Invoice Number",
      accessor: "code",
      sortable: true,
    },
    {
      header: "Client",
      accessor: "client",
      sortable: true,
      cell: (row: Invoice) => getClientName(row, clients)
    },
    {
      header: "Type",
      accessor: "type_id",
      sortable: true,
      cell: (row: Invoice) => getInvoiceTypeNameFromInvoice(row, invoiceTypes)
    },
    {
      header: "Invoice Date",
      accessor: "invoice_date",
      sortable: true,
      cell: (row: Invoice) => {
        if (!row.invoice_date) return "N/A";
        try {
          return new Date(row.invoice_date).toLocaleDateString();
        } catch {
          return row.invoice_date;
        }
      }
    },
    {
      header: "Discount",
      accessor: "total_discount",
      sortable: true,
      cell: (row: Invoice) => formatCurrency(row.total_discount || 0, getPrimaryCurrency(row))
    },
    {
      header: "Final Amount",
      accessor: "final_amount",
      sortable: true,
      cell: (row: Invoice) => formatCurrency(row.final_amount || 0, getPrimaryCurrency(row))
    },
    {
      header: "Status",
      accessor: "status",
      sortable: true,
      cell: (row: Invoice) => {
        const isUpdating = updatingStatus[row.id];
        const canMutate = canMutateInvoiceInCurrentContext(row);

        return (
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Updating...</span>
              </div>
            ) : (
              <Select
                value={row.status}
                onValueChange={(value: InvoiceStatus) => handleQuickStatusUpdate(row, value)}
                disabled={isUpdating || !canMutate || !can('invoice.edit')}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`${row.status === "Paid"
                      ? "bg-green-500"
                      : row.status === "Created"
                        ? "bg-teal-500"
                        : row.status === "Not Paid"
                          ? "bg-red-500"
                          : row.status === "Mail Sent"
                            ? "bg-teal-500"
                            : "bg-gray-500"
                      }`} />
                    <SelectValue>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "Paid"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : row.status === "Created"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400"
                          : row.status === "Not Paid"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            : row.status === "Mail Sent"
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                        {row.status || "Unknown"}
                      </span>
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="w-48">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <span className={`${status.value === "Paid"
                          ? "bg-green-500"
                          : status.value === "Created"
                            ? "bg-teal-500"
                            : status.value === "Not Paid"
                              ? "bg-red-500"
                              : status.value === "Mail Sent"
                                ? "bg-teal-500"
                                : "bg-gray-500"
                          }`} />
                        <span>{status.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      }
    },
    {
      header: "Created By",
      accessor: "created_by",
      sortable: true,
    },
    {
      header: "Actions",
      accessor: "actions",
      sortable: false,
      cell: (row: Invoice) => {
        const isDownloading = downloadingPdf[row.id];
        const isUpdating = updatingStatus[row.id];
        const canMutate = canMutateInvoiceInCurrentContext(row);

        return (
          <TooltipProvider>
            <div className="flex items-center space-x-1">
              {/* View Button with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={
                      row.company_id
                        ? `/invoices/view/${row.id}?context=company&company_id=${row.company_id}`
                        : `/invoices/view/${row.id}?context=personal`
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground hover:bg-muted"
                      disabled={isUpdating}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Invoice</p>
                </TooltipContent>
              </Tooltip>

              {/* Edit Button with Tooltip */}
              {can('invoice.edit') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {canMutate ? (
                    <Link
                      href={
                        row.company_id
                          ? `/invoices/edit/${row.id}?context=company&company_id=${row.company_id}`
                          : `/invoices/edit/${row.id}?context=personal`
                      }
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-foreground hover:bg-muted"
                        disabled={isUpdating}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground hover:bg-muted"
                      disabled={true}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canMutate ? "Edit Invoice" : "Switch to owner account to edit"}</p>
                </TooltipContent>
              </Tooltip>
              )}

              {/* Download Dropdown with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-foreground hover:bg-muted"
                          disabled={!!isDownloading || isUpdating || row.status == 'Draft'}
                        >
                          {isDownloading ? (
                            <div className="flex items-center">
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleDownloadPDF(row, "invoice")}
                          disabled={!!isDownloading || isUpdating}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {isDownloading === "invoice" ? "Generating..." : "Download Invoice PDF"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownloadPDF(row, "receipt")}
                          disabled={!!isDownloading || isUpdating}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          {isDownloading === "receipt" ? "Generating..." : "Download Receipt PDF"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                {row.status !== 'Draft' && (
                  <TooltipContent>
                    <p>Download Options</p>
                  </TooltipContent>
                )}
              </Tooltip>

              {/* Email Button with Tooltip */}
              {can('invoice.mail') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedInvoice(row);
                      setMailDialogOpen(true);
                    }}
                    className="h-8 w-8 text-foreground hover:bg-muted"
                    disabled={isUpdating || row.status == 'Draft' || !canMutate}
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                {row.status !== 'Draft' && canMutate && (
                  <TooltipContent>
                    <p>Send Email</p>
                  </TooltipContent>
                )}
                {!canMutate && (
                  <TooltipContent>
                    <p>Switch to owner account to send email</p>
                  </TooltipContent>
                )}
              </Tooltip>
              )}

              {/* Delete Button with Tooltip */}
              {can('invoice.delete') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeleteInvoiceId(row.id);
                      setDeleteInvoiceCode(row.code);
                      setOpen(true)
                    }}
                    className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    disabled={isUpdating || !canMutate}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canMutate ? "Delete Invoice" : "Switch to owner account to delete"}</p>
                </TooltipContent>
              </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      },
    },
  ];

  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredAndSortedInvoices.slice(startIndex, endIndex);

  // Mobile card renderer - Beautiful, touch-friendly card design
  const renderMobileCard = (invoice: Invoice) => {
    const isDownloading = downloadingPdf[invoice.id];
    const isUpdating = updatingStatus[invoice.id];
    const canMutate = canMutateInvoiceInCurrentContext(invoice);

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200">
        {/* Header: Invoice Number + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-base font-bold text-gray-900 dark:text-white truncate">
              {invoice.code || `Invoice #${invoice.id}`}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {getClientName(invoice, clients)}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
              invoice.status === "Paid"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : invoice.status === "Created"
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                : invoice.status === "Not Paid" || invoice.status === "Rejected"
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                : invoice.status === "Mail Sent"
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            }`}>
              {invoice.status || "Unknown"}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

        {/* Amount Section */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Final Amount
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(invoice.final_amount || 0, getPrimaryCurrency(invoice))}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {getInvoiceTypeNameFromInvoice(invoice, invoiceTypes)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* View Button - Primary Action */}
          <Link
            href={
              invoice.company_id
                ? `/invoices/view/${invoice.id}?context=company&company_id=${invoice.company_id}`
                : `/invoices/view/${invoice.id}?context=personal`
            }
            className="flex-1"
          >
            <Button
              className="w-full h-14 min-h-[56px] text-base font-semibold rounded-xl"
              disabled={isUpdating}
            >
              <Eye className="h-5 w-5 mr-2" />
              View Invoice
            </Button>
          </Link>

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-14 w-14 min-h-[56px] rounded-xl"
                disabled={isUpdating}
              >
                <span className="sr-only">More actions</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Edit */}
              {can('invoice.edit') && (canMutate ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      invoice.company_id
                        ? `/invoices/edit/${invoice.id}?context=company&company_id=${invoice.company_id}`
                        : `/invoices/edit/${invoice.id}?context=personal`
                    }
                    className="cursor-pointer"
                  >
                    <Edit className="mr-3 h-5 w-5" />
                    <span className="text-base">Edit Invoice</span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <Edit className="mr-3 h-5 w-5" />
                  <span>Switch to owner to edit</span>
                </DropdownMenuItem>
              ))}

              {/* Download PDF */}
              <DropdownMenuItem
                onClick={() => handleDownloadPDF(invoice, "invoice")}
                disabled={!!isDownloading || isUpdating || invoice.status === 'Draft'}
                className="cursor-pointer"
              >
                {isDownloading === "invoice" ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="mr-3 h-5 w-5" />
                )}
                <span className="text-base">
                  {isDownloading === "invoice" ? "Generating..." : "Download Invoice PDF"}
                </span>
              </DropdownMenuItem>

              {/* Download Receipt */}
              <DropdownMenuItem
                onClick={() => handleDownloadPDF(invoice, "receipt")}
                disabled={!!isDownloading || isUpdating || invoice.status === 'Draft'}
                className="cursor-pointer"
              >
                {isDownloading === "receipt" ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                  <Receipt className="mr-3 h-5 w-5" />
                )}
                <span className="text-base">
                  {isDownloading === "receipt" ? "Generating..." : "Download Receipt"}
                </span>
              </DropdownMenuItem>

              {/* Email */}
              {can('invoice.mail') && (
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(invoice);
                  setMailDialogOpen(true);
                }}
                disabled={isUpdating || invoice.status === 'Draft' || !canMutate}
                className="cursor-pointer"
              >
                <Mail className="mr-3 h-5 w-5" />
                <span className="text-base">Send Email</span>
              </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Delete */}
              {can('invoice.delete') && (
              <DropdownMenuItem
                onClick={() => {
                  setDeleteInvoiceId(invoice.id);
                  setDeleteInvoiceCode(invoice.code);
                  setOpen(true);
                }}
                disabled={isUpdating || !canMutate}
                className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
              >
                <Trash2 className="mr-3 h-5 w-5" />
                <span className="text-base">Delete Invoice</span>
              </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Invoices</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {can('invoice-client.create') && (
            <Link href={viewScope === 'all' ? '#' : '/invoice/clients/create'} className="w-full sm:w-auto" onClick={viewScope === 'all' ? (e) => e.preventDefault() : undefined}>
              <Button variant="outline" className="w-full sm:w-auto h-12 min-h-[48px] text-base font-medium text-foreground border-border hover:bg-muted" disabled={viewScope === 'all'} title={viewScope === 'all' ? 'Create Client is disabled in All-Accounts view' : ''}>
                + Create Client
              </Button>
            </Link>
            )}
            {can('invoice.create') && (
            <Link href="/invoices/create" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 min-h-[48px] text-base font-medium">
                + Create Invoice
              </Button>
            </Link>
            )}
          </div>
        </div>

        {/* Search & Filters - Fully Responsive */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Input - Full width on mobile */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 min-h-[48px] text-base bg-background text-foreground border-border"
              />
            </div>

            {/* Account Filter - Only in ALL view */}
            {viewScope === 'all' && availableCompanies.length > 0 && (
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-full sm:w-48 h-12 min-h-[48px] text-base bg-background text-foreground border-border">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Accounts" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all" className="text-base text-foreground hover:bg-muted">All Accounts</SelectItem>
                  <SelectItem value="personal" className="text-base text-foreground hover:bg-muted">Personal</SelectItem>
                  {availableCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()} className="text-base text-foreground hover:bg-muted">
                      {company.company_name || `Company #${company.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Rows per page */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-base text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20 h-12 min-h-[48px] text-base bg-background text-foreground border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="10" className="text-base text-foreground hover:bg-muted">10</SelectItem>
                <SelectItem value="20" className="text-base text-foreground hover:bg-muted">20</SelectItem>
                <SelectItem value="30" className="text-base text-foreground hover:bg-muted">30</SelectItem>
                <SelectItem value="50" className="text-base text-foreground hover:bg-muted">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedInvoices.length === 0
              ? `No invoices found for "${searchQuery}"`
              : `Showing ${filteredAndSortedInvoices.length} of ${invoices.length} invoices for "${searchQuery}"`
            }
          </div>
        )}

        <Table
          data={currentData}
          columns={columns}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={filteredAndSortedInvoices.length}
          showingFrom={filteredAndSortedInvoices.length > 0 ? startIndex + 1 : 0}
          showingTo={Math.min(endIndex, filteredAndSortedInvoices.length)}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChangeNumber}
          loading={loading}
          onSort={handleSort}
          sortField={sortField}
          sortDirection={sortDirection}
          mobileCardRenderer={renderMobileCard}
          tableName="invoices"
        />

        <MailDialog
          open={mailDialogOpen}
          onOpenChange={setMailDialogOpen}
          invoice={selectedInvoice}
          clients={clients}
          invoiceTypes={invoiceTypes}
        />

        {deleteInvoiceId && (
          <DeleteInvoicePopup
            open={open}
            invoiceCode={deleteInvoiceCode}
            onClose={() => {
              setDeleteInvoiceId(null);
              setDeleteInvoiceCode(undefined);
              setOpen(false)
            }}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </TooltipProvider>
  );
}