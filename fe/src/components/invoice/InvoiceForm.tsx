// components/invoice/InvoiceForm.tsx - UPDATED WITH CIS TAX DEDUCTION AND CIS-SPECIFIC FIELDS
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/slices/store";
import { getInvoiceTypes, getInvoiceClients, getInvoiceData, saveOrUpdateDraftInvoice, checkInvoiceCodeExists } from "@/services/invoice.service";
import { setInvoiceTypes, setClients, setSelectedPdfTemplate, addClient } from "@/slices/invoiceSlice";
import { Client, InvoiceType, InvoiceItem, Invoice, InvoiceStatus, formatCurrency, getCurrencySymbol, CURRENCY_OPTIONS, DEFAULT_CURRENCY, DEFAULT_STATUS, getDefaultInvoiceTypeId, isQuotationType, StoreDraftInvoiceRequest } from "@/services/interface/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarIcon, Plus, Trash2, Edit2, Info, Lock, ChevronDown, Pencil, Save, X, Check, FileText, ArrowUp, ArrowDown, AlertTriangle, ChevronsUpDown } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { PDFPreview } from "./PDFPreview";
import { toast } from "sonner";
import { CreateClientDialog } from "./CreateClientDialog";
import { ItemLibrary } from "./ItemLibrary";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { User } from "@/services/interface/User";
import { changeCompanyDetails, getCurrentUser, switchAccountContext, http } from "@/services/service";
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser } from '@/utils/account-context';
import { canUseFeature } from '@/lib/plan-access';
import { canManageCompanyProfile } from '@/utils/permissions';
import { getViewScope } from "@/utils/view-scope";
import {
  onBankDetailsChanged,
  loadBankDetailsFromSync,
  areBankDetailsComplete,
  saveBankDetailsToSync,
  type BankDetailsSyncScope,
} from '@/utils/bank-details-sync';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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


// ─── CIS type name — change here if the backend name ever differs ─────────────
const CIS_TYPE_NAME = 'Construction Industry Scheme CIS'
const CIS_RATE = 0.20

export interface InvoiceFormSubmitData {
  code?: string;
  invoice_code?: string;
  client_id: number | string;
  type_id: number | string;
  currency: string;
  invoice_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  total_amount: number | string;
  total_vat?: number | string;
  total_discount?: number | string;
  final_amount: number | string;
  status?: InvoiceStatus;
  pdf_type?: string;
  quotation_title?: string;
  quotation_content?: string;
  bank_payment: boolean;
  payment_link: boolean;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  company_address?: string | null;
  // ── CIS fields (only present when CIS type is selected) ──────────────────
  cis_tax?: number;
  cis_net?: number;
  client_utr?: string;
  cis_tax_value?: number;
  cis_enabled?: boolean;
  // Company context: which company to use for this invoice's branding
  company_id?: number | null;
  // Flag: true when invoice is created from ALL-Accounts View
  all_accounts_view?: boolean;
}

interface InvoiceFormProps {
  initialData?: Invoice;
  onSubmit: (data: InvoiceFormSubmitData, isDraft: boolean) => void | Promise<void>;
  isEdit?: boolean;
  isView?: boolean;
  isSubmitting?: boolean;
  tempUser?: User
  showCompanySelector?: boolean;
}

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

const resolveInvoiceTypeId = (invoice: Invoice, invoiceTypes: InvoiceType[]): string => {
  if (invoice.type_id) return invoice.type_id.toString();
  if (invoice.invoice_type && invoiceTypes.length > 0) {
    const matchingType = invoiceTypes.find((t: InvoiceType) => t.name === invoice.invoice_type);
    if (matchingType) return matchingType.id.toString();
  }
  return "";
};

const resolveClientId = (invoice: Invoice, clients: Client[]): string => {
  if (invoice.client_id) return invoice.client_id.toString();
  else if (typeof invoice.client === 'string') {
    const matchingClient = clients.find((c: Client) => c.name === invoice.client);
    if (matchingClient) return matchingClient.id.toString();
  } else if (invoice.client && typeof invoice.client === 'object') {
    const clientObj = invoice.client as Client;
    return clientObj.id?.toString() || "";
  }
  return "";
};

function CurrencyCombobox({
  value,
  onValueChange,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = CURRENCY_OPTIONS.filter((c) =>
    c.value.toLowerCase().includes(search.toLowerCase()) ||
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const selected = CURRENCY_OPTIONS.find((c) => c.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-9 w-full flex items-center justify-between rounded-md border border-border bg-background px-3 text-xs text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selected.symbol}</span>
              <span>{selected.value}</span>
              <span className="text-muted-foreground">{selected.label.split(" - ")[1]}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select currency</span>
          )}
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search currency..."
            value={search}
            onValueChange={setSearch}
            className="text-xs"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="text-xs py-3 text-center text-muted-foreground">
              No currency found.
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((currency) => (
                <CommandItem
                  key={currency.value}
                  value={currency.value}
                  onSelect={() => {
                    onValueChange(currency.value);
                    setSearch("");
                    setOpen(false);
                  }}
                  className="text-xs cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3 shrink-0",
                      value === currency.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium mr-1">{currency.symbol}</span>
                  <span className="mr-1">{currency.value}</span>
                  <span className="text-muted-foreground truncate">{currency.label.split(" - ")[1]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function InvoiceForm({
  initialData,
  onSubmit,
  isEdit = false,
  isView = false,
  isSubmitting = false,
  tempUser,
  showCompanySelector = true,
}: InvoiceFormProps) {
  const dispatch = useDispatch<AppDispatch>();

  const { invoiceTypes, clients, selectedPdfTemplate } = useSelector((state: RootState) => state.invoice);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [isDraft, setIsDraft] = useState(false);
  const [formData, setFormData] = useState<{
    code: string;
    client_id: string;
    type_id: string;
    currency: string;
    status: InvoiceStatus;
    invoice_date: Date;
    due_date: Date | null;
    items: InvoiceItem[];
    total_amount: number;
    total_discount: number;
    total_vat: number;
    final_amount: number;
    quotation_title: string;
    quotation_content: string;
    payment_link: boolean;
    bank_payment: boolean;
    notes: string;
    client_utr: string;
    cis_tax_value: number;
    cis_enabled: boolean;
    company_id: number | null;
  }>(() => {
    return {
      code: "",
      client_id: "",
      type_id: "",
      currency: DEFAULT_CURRENCY,
      status: DEFAULT_STATUS,
      invoice_date: new Date(),
      due_date: null,
      items: [] as InvoiceItem[],
      total_amount: 0,
      total_discount: 0,
      total_vat: 0,
      final_amount: 0,
      quotation_title: "",
      quotation_content: "",
      payment_link: false,
      bank_payment: false,
      notes: "",
      client_utr: "",
      cis_tax_value: 20,
      cis_enabled: false,
      company_id: null,
    };
  });

  const [fieldErrors, setFieldErrors] = useState<{
    client_id: boolean;
    type_id: boolean;
    code?: boolean;
  }>({
    client_id: false,
    type_id: false,
    code: false,
  });

  // ── Code validation state ────────────────────────────────────────────────
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = useState<string | null>(null);
  const [lastValidatedCode, setLastValidatedCode] = useState<string | null>(null);
  const codeValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [currentItem, setCurrentItem] = useState({
    type: "service",
    name: "",
    price: 0,
    quantity: 1,
    discount: 0,
    vat: 0,
    total: 0,
    project_reference: "",
    custom_fields: [] as { key: string; value: string }[],
  });
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [customFieldsItemIndex, setCustomFieldsItemIndex] = useState<number | null>(null);

  const [lastChangedField, setLastChangedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);

  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [tempItem, setTempItem] = useState<InvoiceItem | null>(null);
  const [lastChangedInlineField, setLastChangedInlineField] = useState<string | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [itemOrderMode, setItemOrderMode] = useState<"alphabetical" | "custom">("alphabetical");

  // ── Bank details prompt (used when toggling Bank payment) ──────────────────
  const [bankDetailsDialogOpen, setBankDetailsDialogOpen] = useState(false);
  const [parentBankDetailsMissingDialogOpen, setParentBankDetailsMissingDialogOpen] = useState(false);
  const [bankDetailsSaving, setBankDetailsSaving] = useState(false);
  const [stripeNotConnectedDialogOpen, setStripeNotConnectedDialogOpen] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [savingClientUtr, setSavingClientUtr] = useState(false);
  const [utrConfirmDialogOpen, setUtrConfirmDialogOpen] = useState(false);
  const [pendingUtrValue, setPendingUtrValue] = useState<string>("");
  const [bankDetailsOverride, setBankDetailsOverride] = useState<{
    account_name?: string | null;
    account_number?: string | null;
    sort_code?: string | null;
  } | null>(null);
  const [bankDetailsDraft, setBankDetailsDraft] = useState({
    account_name: "",
    account_number: "",
    sort_code: "",
  });

  // ── Company selector: which company's branding to use for this invoice ────
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companySelectionInitialized, setCompanySelectionInitialized] = useState(false);

  const selectedCompanyIdRef = useRef<number | null>(null);
  const selectedCompanyModeRef = useRef<"personal" | "company">("personal");
  const bankAutoToggleHandledRef = useRef(false);

  // Snapshots of user data fetched in specific contexts (personal or company)
  const [selectedCompanyUserSnapshot, setSelectedCompanyUserSnapshot] = useState<any>(null);
  const [personalUserSnapshot, setPersonalUserSnapshot] = useState<any>(null);

  // Track the original context so we can restore it after switching for data fetch
  const originalContextSnapshotRef = useRef<{ type: "personal" | "company"; companyId: number | null } | null>(null);

  // ── Available companies from tempUser (populated by backend via /auth/me) ─
  const normalizedTempUser: any = (tempUser as any)?.data ?? tempUser;
  const normalizedAuthUser: any = authUser ?? {};
  const personalCompanyLabel =
    `${normalizedTempUser?.first_name ?? normalizedAuthUser?.first_name ?? ''} ${normalizedTempUser?.last_name ?? normalizedAuthUser?.last_name ?? ''}`.trim()
    || normalizedTempUser?.company?.company_name
    || normalizedAuthUser?.company?.company_name
    || 'Personal';

  const availableCompanies: Array<{
    id: number;
    host_id?: number | null;
    account_type?: string | null;
    company_name?: string | null;
    business_email?: string | null;
    company_address?: string | null;
    company_currency?: string | null;
    company_logo?: string | null;
    vat_no?: string | null;
    phone_number?: string | null;
    bank?: {
      account_name?: string | null;
      account_number?: string | null;
      sort_code?: string | null;
    } | null;
    stripe?: { status: string } | null;
    is_active?: boolean;
  }> = useMemo(() => {
    return (
      Array.isArray(normalizedTempUser?.available_companies)
        ? normalizedTempUser.available_companies
        : (Array.isArray(normalizedAuthUser?.available_companies)
          ? normalizedAuthUser.available_companies
          : [])
    )
      .map((company: any) => {
        const normalizedId = Number(company?.company_id ?? company?.id);
        const normalizedHostId = Number(company?.host_id);
        const normalizedCompanyName =
          company?.company_name ??
          company?.name ??
          company?.company?.company_name ??
          null;
        const normalizedCompanyAddress =
          company?.company_address ??
          company?.company?.company_address ??
          null;
        const normalizedBusinessEmail =
          company?.business_email ??
          company?.company?.business_email ??
          null;
        const normalizedCompanyCurrency =
          company?.company_currency ??
          company?.company?.company_currency ??
          null;
        const normalizedCompanyLogo =
          company?.company_logo ??
          company?.company?.company_logo ??
          null;
        const normalizedInvoiceFormat =
          company?.invoice_format ??
          company?.company?.invoice_format ??
          null;
        const normalizedVat =
          company?.vat_no ??
          company?.company?.vat_no ??
          null;
        const normalizedPhone =
          company?.phone_number ??
          company?.company?.phone_number ??
          null;
        const normalizedBank =
          company?.bank ??
          company?.bank_details ??
          company?.company?.bank ??
          company?.company?.bank_details ??
          (company?.account_name || company?.account_number || company?.sort_code
            ? {
              account_name: company?.account_name ?? null,
              account_number: company?.account_number ?? null,
              sort_code: company?.sort_code ?? null,
            }
            : null);
        return {
          ...company,
          id: Number.isFinite(normalizedId) ? normalizedId : company?.id,
          host_id: Number.isFinite(normalizedHostId) ? normalizedHostId : company?.host_id,
          company_name: normalizedCompanyName,
          company_address: normalizedCompanyAddress,
          business_email: normalizedBusinessEmail,
          company_currency: normalizedCompanyCurrency,
          company_logo: normalizedCompanyLogo,
          invoice_format: normalizedInvoiceFormat,
          vat_no: normalizedVat,
          phone_number: normalizedPhone,
          bank: normalizedBank,
          stripe: company?.stripe ?? null,
        };
      })
      .filter((company: any) => Number.isFinite(Number(company?.id)) && Number(company.id) > 0);
  }, [normalizedTempUser, normalizedAuthUser]);

  useEffect(() => {
    selectedCompanyIdRef.current = selectedCompanyId;
    selectedCompanyModeRef.current = selectedCompanyId !== null ? "company" : "personal";
  }, [selectedCompanyId]);

  // When a company is selected, switch backend context, fetch fresh user data (bank + stripe), then restore original context
  const activeFetchIdRef = useRef(0);

  useEffect(() => {
    if (!showCompanySelector) return;
    const fetchId = ++activeFetchIdRef.current;

    // ── Proactive Seeding: update UI instantly from availableCompanies data ──
    if (selectedCompanyId !== null) {
      const fastMatch = availableCompanies.find(c => Number(c.id) === Number(selectedCompanyId));
      if (fastMatch) {
        // Construct a partial user object that matches the structure expected by the UI.
        // This ensures Name, Logo, Bank, and Stripe status update INSTANTLY without network delay.
        setSelectedCompanyUserSnapshot({
          id: fastMatch.id,
          company: fastMatch,
          bank: fastMatch.bank,
          stripe: fastMatch.stripe || { status: 'not_connected' },
          _is_proactive: true
        });
      }
    } else {
      // For personal context, if we already have normalizedTempUser, use it to seed personalUserSnapshot
      if (normalizedTempUser) {
        setPersonalUserSnapshot({ ...normalizedTempUser, _is_proactive: true });
      }
    }

    const fetchCompanyContextData = async () => {
      try {
        // Capture original context on first run
        if (!originalContextSnapshotRef.current) {
          try {
            const meResp = await getCurrentUser();
            const me = (meResp as any)?.data ?? meResp;
            const origType: "personal" | "company" =
              me?.current_context?.type === "company" ? "company" : "personal";
            const origCompanyIdRaw = Number(me?.current_context?.company_id ?? me?.active_company_id);
            const origCompanyId = Number.isFinite(origCompanyIdRaw) && origCompanyIdRaw > 0 ? origCompanyIdRaw : null;
            originalContextSnapshotRef.current = { type: origType, companyId: origCompanyId };
          } catch {
            originalContextSnapshotRef.current = { type: "personal", companyId: null };
          }
        }

        const snapshot = originalContextSnapshotRef.current;

        if (selectedCompanyId !== null) {
          try {
            await switchAccountContext({ type: "company", company_id: selectedCompanyId });

            // Parallelize me fetch and invoice data fetch to save round-trips
            const [meResp, invData] = await Promise.all([
              getCurrentUser({ force: true }),
              isEdit ? Promise.resolve(null) : getInvoiceData()
            ]);

            const me = (meResp as any)?.data ?? meResp;
            const nextCode = invData?.invoice_code;

            if (fetchId === activeFetchIdRef.current) {
              setSelectedCompanyUserSnapshot(me);
              if (nextCode && !isEdit) {
                setFormData(prev => ({ ...prev, code: nextCode }));
              }
            }
          } finally {
            if (snapshot && snapshot.type === "company" && snapshot.companyId) {
              await switchAccountContext({ type: "company", company_id: snapshot.companyId });
            } else {
              await switchAccountContext({ type: "personal" });
            }
          }
        } else {
          try {
            await switchAccountContext({ type: "personal" });

            // Parallelize me fetch and invoice data fetch
            const [meResp, invData] = await Promise.all([
              getCurrentUser({ force: true }),
              isEdit ? Promise.resolve(null) : getInvoiceData()
            ]);

            const me = (meResp as any)?.data ?? meResp;
            const nextCode = invData?.invoice_code;

            if (fetchId === activeFetchIdRef.current) {
              setPersonalUserSnapshot(me);
              if (nextCode && !isEdit) {
                setFormData(prev => ({ ...prev, code: nextCode }));
              }
            }
          } finally {
            if (snapshot && snapshot.type === "company" && snapshot.companyId) {
              await switchAccountContext({ type: "company", company_id: snapshot.companyId });
            } else {
              await switchAccountContext({ type: "personal" });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch account identity data:", err);
      }
    };

    fetchCompanyContextData();
  }, [selectedCompanyId, showCompanySelector, isEdit]);

  // Refresh local snapshots when company details are updated elsewhere in the app.
  // This ensures the PDF preview and instant UI seeds reflect the latest saved company data.
  useEffect(() => {
    const handleCompanyUpdated = () => {
      (async () => {
        try {
          const meResp = await getCurrentUser({ force: true });
          const me = (meResp as any)?.data ?? meResp;
          if (selectedCompanyId !== null) {
            setSelectedCompanyUserSnapshot(me);
          } else {
            setPersonalUserSnapshot(me);
          }
        } catch (err) {
          console.error('Failed to refresh user snapshot after company update:', err);
        }
      })();
    };

    window.addEventListener('companyUpdated', handleCompanyUpdated);
    return () => window.removeEventListener('companyUpdated', handleCompanyUpdated);
  }, [selectedCompanyId]);

  // Listen for bank details changes (e.g. saved from Settings) — do not auto-enable toggle on mount
  useEffect(() => {
    const cleanup = onBankDetailsChanged((bankDetails) => {
      if (bankDetails && areBankDetailsComplete(bankDetails)) {
        setBankDetailsOverride(bankDetails);
        toast.success('Bank details synced from Settings');
      } else if (bankDetails === null) {
        setBankDetailsOverride(null);
        setFormData(prev => ({
          ...prev,
          bank_payment: false,
        }));
      }
    });

    return cleanup;
  }, []);

  // Restore original context on unmount
  useEffect(() => {
    return () => {
      const snapshot = originalContextSnapshotRef.current;
      if (snapshot) {
        if (snapshot.type === "company" && snapshot.companyId) {
          switchAccountContext({ type: "company", company_id: snapshot.companyId }).catch(() => { });
        } else {
          switchAccountContext({ type: "personal" }).catch(() => { });
        }
      }
    };
  }, []);

  // Cleanup code validation timeout on unmount
  useEffect(() => {
    return () => {
      if (codeValidationTimeoutRef.current) {
        clearTimeout(codeValidationTimeoutRef.current);
      }
    };
  }, []);

  // ── CIS detection (must be declared before useEffect that uses it) ─────────
  const isCIS = (invoiceTypes.length > 0 && formData.type_id
    ? invoiceTypes.find(t => t.id.toString() === formData.type_id)?.name === CIS_TYPE_NAME
    : false) || formData.cis_enabled

  // Build the "effective" user whose company details drive the PDF preview
  const selectedCompanyData = selectedCompanyId !== null
    ? availableCompanies.find((c) =>
      Number(c.id) === Number(selectedCompanyId)
    ) ?? null
    : null;

  const canBillAnyCurrency = useMemo(
    () => canUseFeature(authUser as User, 'any_currency'),
    [authUser],
  );

  const lockedInvoiceCurrency = useMemo(() => {
    const fromCompany =
      selectedCompanyData?.company_currency ??
      (authUser as User | null)?.company?.company_currency ??
      null;
    return String(fromCompany || DEFAULT_CURRENCY).toUpperCase();
  }, [selectedCompanyData, authUser]);

  const contextSourceUser = normalizedTempUser ?? normalizedAuthUser ?? null;
  const currentContextType = getResolvedContextType(contextSourceUser);
  const activeContextCompanyId = getResolvedActiveCompanyId(contextSourceUser);

  const bankSyncScope = useMemo((): BankDetailsSyncScope => {
    const user = contextSourceUser;
    const userId = Number(user?.id);
    const companyId =
      selectedCompanyId !== null
        ? selectedCompanyId
        : currentContextType === 'company'
          ? activeContextCompanyId
          : null;
    return {
      userId: Number.isFinite(userId) && userId > 0 ? userId : undefined,
      companyId: companyId ?? undefined,
    };
  }, [contextSourceUser, selectedCompanyId, currentContextType, activeContextCompanyId]);

  const bankAutoScopeKey = useMemo(
    () => `${bankSyncScope.userId ?? 'unknown'}:${bankSyncScope.companyId ?? 'personal'}`,
    [bankSyncScope.userId, bankSyncScope.companyId]
  );

  // When a company is selected via the dropdown, use the snapshot fetched in that company's context
  // for bank details. Otherwise use the personal snapshot if "Personal" is selected.
  const snapshotBankSource = selectedCompanyId !== null ? selectedCompanyUserSnapshot : personalUserSnapshot;
  const normalizeBankCandidate = (bank: any) => {
    if (!bank) return null;
    const account_name = typeof bank?.account_name === 'string' ? bank.account_name.trim() : '';
    const account_number = typeof bank?.account_number === 'string' ? bank.account_number.trim() : '';
    const sort_code = typeof bank?.sort_code === 'string' ? bank.sort_code.trim() : '';
    if (!account_name || !account_number || !sort_code) return null;
    return { account_name, account_number, sort_code };
  };

  const companySnapshotBank = normalizeBankCandidate(
    snapshotBankSource
      ? (snapshotBankSource?.company?.bank ??
        snapshotBankSource?.company?.bank_details ??
        (snapshotBankSource?.company?.account_name ||
          snapshotBankSource?.company?.account_number ||
          snapshotBankSource?.company?.sort_code
          ? {
            account_name: snapshotBankSource?.company?.account_name ?? null,
            account_number: snapshotBankSource?.company?.account_number ?? null,
            sort_code: snapshotBankSource?.company?.sort_code ?? null,
          }
          : null) ??
        snapshotBankSource?.bank ??
        null)
      : null
  );

  const selectedCompanyBank = normalizeBankCandidate(selectedCompanyData?.bank);
  // For the active company (not explicitly selected from dropdown), bank details
  // may live on the company object rather than the top-level user bank.
  const activeCompanyBank = normalizeBankCandidate(
    currentContextType === 'company' && selectedCompanyId === null
      ? (normalizedTempUser?.company?.bank ??
        normalizedTempUser?.company?.bank_details ??
        (normalizedTempUser?.company?.account_name ||
          normalizedTempUser?.company?.account_number ||
          normalizedTempUser?.company?.sort_code
          ? {
            account_name: normalizedTempUser?.company?.account_name ?? null,
            account_number: normalizedTempUser?.company?.account_number ?? null,
            sort_code: normalizedTempUser?.company?.sort_code ?? null,
          }
          : null) ??
        normalizedAuthUser?.company?.bank ??
        null)
      : null
  );
  const topLevelUserBank =
    normalizeBankCandidate(normalizedTempUser?.bank) ??
    normalizeBankCandidate(normalizedAuthUser?.bank);
  const apiBank =
    companySnapshotBank ??
    selectedCompanyBank ??
    activeCompanyBank ??
    topLevelUserBank ??
    null;

  const resolvedBank = bankDetailsOverride ?? apiBank ?? null;

  // Only treat bank details as present when API (or in-session save) has all fields — not stale localStorage
  const hasBankDetails =
    areBankDetailsComplete(apiBank) || areBankDetailsComplete(bankDetailsOverride);

  // If API has no bank details yet, fall back to synced values from localStorage.
  useEffect(() => {
    if (isEdit || isView) return;
    if (!contextSourceUser?.id) return;

    if (!areBankDetailsComplete(apiBank) && !areBankDetailsComplete(bankDetailsOverride)) {
      const staleSync = loadBankDetailsFromSync(bankSyncScope);
      if (areBankDetailsComplete(staleSync)) {
        setBankDetailsOverride(staleSync);
        return;
      }
      setFormData((prev) => (prev.bank_payment ? { ...prev, bank_payment: false } : prev));
    }
  }, [
    isEdit,
    isView,
    contextSourceUser?.id,
    apiBank?.account_name,
    apiBank?.account_number,
    apiBank?.sort_code,
    bankDetailsOverride,
    bankSyncScope,
  ]);

  // Reset auto-toggle behavior whenever user/account context scope changes.
  useEffect(() => {
    bankAutoToggleHandledRef.current = false;
  }, [bankAutoScopeKey]);

  // Auto-enable bank payment on create page when bank details already exist.
  useEffect(() => {
    if (isEdit || isView) return;
    if (!contextSourceUser?.id) return;
    if (bankAutoToggleHandledRef.current) return;
    if (!hasBankDetails) return;

    setFormData((prev) => (prev.bank_payment ? prev : { ...prev, bank_payment: true }));
    bankAutoToggleHandledRef.current = true;
  }, [isEdit, isView, contextSourceUser?.id, hasBankDetails]);

  // ── Resolve company address (snapshot when company is selected, otherwise active company or temp user) ──
  const resolvedCompanyAddress = 
    selectedCompanyId !== null && selectedCompanyUserSnapshot?.company?.company_address
      ? selectedCompanyUserSnapshot.company.company_address
      : selectedCompanyId !== null
        ? selectedCompanyData?.company_address ?? null
        : currentContextType === 'company'
          ? (normalizedTempUser?.company?.company_address ?? normalizedAuthUser?.company?.company_address ?? null)
          : null;
  
  const isCurrentUserSubUser = isSubUser(normalizedTempUser ?? normalizedAuthUser);
  const canManagePaymentSettings = canManageCompanyProfile(normalizedTempUser ?? normalizedAuthUser);

  // When a company is selected via the dropdown (showCompanySelector=true), use the snapshot's
  // Stripe status. If the snapshot hasn't loaded yet, treat as not connected (don't fall back to
  // current session data which may be for a different company).
  // When the company selector is NOT shown, the snapshot is never fetched, so always use the
  // current session data (which reflects the active context's Stripe status).
  // Otherwise use the current session data.
  const stripeStatusSource: any =
    showCompanySelector
      ? (selectedCompanyId !== null ? (selectedCompanyUserSnapshot ?? { stripe: { status: 'not_connected' } }) : (personalUserSnapshot ?? normalizedTempUser ?? normalizedAuthUser))
      : (normalizedTempUser ?? normalizedAuthUser);
  const stripeStatusRaw = String(
    stripeStatusSource?.stripe?.status ??
    stripeStatusSource?.stripe_status ??
    stripeStatusSource?.stripe_payment_status ??
    stripeStatusSource?.stripe?.payment_status ??
    ""
  ).toLowerCase();
  // Personal accounts may connect via manual keys instead of OAuth
  const hasStripeKeys = !!(
    stripeStatusSource?.stripe_secret_key ||
    stripeStatusSource?.stripe_published_key ||
    stripeStatusSource?.stripe?.secret_key ||
    stripeStatusSource?.stripe?.publish_key
  );
  const isStripeConnected =
    stripeStatusRaw === "connected" ||
    stripeStatusRaw === "active" ||
    stripeStatusRaw === "enabled" ||
    Boolean(stripeStatusSource?.stripe_connected) ||
    hasStripeKeys;

  const availableCompaniesRef = useRef(availableCompanies);
  const currentContextTypeRef = useRef(currentContextType);
  const activeContextCompanyIdRef = useRef(activeContextCompanyId);

  useEffect(() => {
    availableCompaniesRef.current = availableCompanies;
    currentContextTypeRef.current = currentContextType;
    activeContextCompanyIdRef.current = activeContextCompanyId;
  }, [availableCompanies, currentContextType, activeContextCompanyId]);

  const personalContextCompanyId = (() => {
    // Personal selection must never reuse stale company ids.
    // Prefer explicit personal identifiers only.
    const directPersonalId = Number(contextSourceUser?.personal_company_id);
    if (Number.isFinite(directPersonalId) && directPersonalId > 0) return directPersonalId;

    // Use the primary host_id for personal branding/tenancy as required by backend.
    const userHostId = Number(contextSourceUser?.host_id ?? normalizedAuthUser?.host_id);
    if (Number.isFinite(userHostId) && userHostId > 0) return userHostId;

    const currentContextHostId = Number(
      contextSourceUser?.current_context?.type === "personal"
        ? contextSourceUser?.current_context?.host_id
        : null
    );
    if (Number.isFinite(currentContextHostId) && currentContextHostId > 0) return currentContextHostId;

    const personalCompanyFromList = availableCompanies.find((c: any) => {
      const accountType = String(c?.account_type ?? "").toLowerCase();
      return accountType === "personal";
    });
    const listPersonalId = Number(personalCompanyFromList?.id ?? personalCompanyFromList?.host_id);
    if (Number.isFinite(listPersonalId) && listPersonalId > 0) return listPersonalId;

    const userIdFallback = Number(contextSourceUser?.id ?? normalizedAuthUser?.id);
    if (Number.isFinite(userIdFallback) && userIdFallback > 0) return userIdFallback;

    return null;
  })();
  const effectiveTempUser =
    selectedCompanyId !== null && selectedCompanyUserSnapshot
      ? {
        ...selectedCompanyUserSnapshot,
        account_type: "company",
        current_context: {
          ...selectedCompanyUserSnapshot.current_context,
          type: "company",
          company_id: selectedCompanyId,
        },
        active_context_type: "company",
        active_company_id: selectedCompanyId,
        company: {
          ...(selectedCompanyUserSnapshot.company ?? {}),
          company_name: selectedCompanyUserSnapshot.company?.company_name || selectedCompanyData?.company_name || "Company",
          // Prioritize the snapshot's logo which was just fetched fresh
          company_logo: selectedCompanyUserSnapshot.company?.company_logo ||
            selectedCompanyUserSnapshot.company?.logo ||
            selectedCompanyData?.company_logo ||
            null,
          company_address: selectedCompanyUserSnapshot.company?.company_address || selectedCompanyData?.company_address || null,
          business_email: selectedCompanyUserSnapshot.company?.business_email || selectedCompanyData?.business_email || null,
          company_currency: selectedCompanyUserSnapshot.company?.company_currency || selectedCompanyData?.company_currency || null,
          vat_no: selectedCompanyUserSnapshot.company?.vat_no || selectedCompanyData?.vat_no || null,
          phone_number: selectedCompanyUserSnapshot.company?.phone_number || selectedCompanyData?.phone_number || null,
          // Merge bank from snapshot
          bank: companySnapshotBank ?? selectedCompanyUserSnapshot.company?.bank ?? null,
          bank_details: companySnapshotBank ?? selectedCompanyUserSnapshot.company?.bank ?? null,
        },
        bank: companySnapshotBank ?? selectedCompanyUserSnapshot.bank ?? null,
        stripe: selectedCompanyUserSnapshot.stripe ?? null,
      }
      : selectedCompanyId === null && personalUserSnapshot
        ? {
          ...personalUserSnapshot,
          // Explicitly use personal branding from the snapshot
          account_type: "personal",
          current_context: {
            ...personalUserSnapshot.current_context,
            type: "personal",
            company_id: null,
          },
          active_context_type: "personal",
          active_company_id: null,
          company: personalUserSnapshot.company
            ? {
              ...personalUserSnapshot.company,
              // Ensure personal name is used if no company name exists
              company_name: personalUserSnapshot.company?.company_name ||
                `${personalUserSnapshot.first_name || ""} ${personalUserSnapshot.last_name || ""}`.trim() ||
                "Personal",
              company_logo: personalUserSnapshot.company?.company_logo || personalUserSnapshot.profile_img || null,
            }
            : {
              company_name: `${personalUserSnapshot.first_name || ""} ${personalUserSnapshot.last_name || ""}`.trim() || "Personal",
              company_logo: personalUserSnapshot.profile_img || null,
            },
          host: personalUserSnapshot.host ?? null,
          stripe: personalUserSnapshot.stripe ?? null,
          bank: personalUserSnapshot.bank ?? null,
        }
        : (normalizedTempUser ?? normalizedAuthUser);

  // Default selector to active company once (do not override manual user changes)
  useEffect(() => {
    const resolvedActiveContextCompanyId =
      typeof activeContextCompanyId === "number" ? activeContextCompanyId : null;

    if (
      !companySelectionInitialized &&
      selectedCompanyId === null &&
      currentContextType === "company" &&
      Number.isFinite(resolvedActiveContextCompanyId) &&
      (resolvedActiveContextCompanyId ?? 0) > 0 &&
      availableCompanies.some((c) => c.id === resolvedActiveContextCompanyId)
    ) {
      setSelectedCompanyId(resolvedActiveContextCompanyId);
      selectedCompanyIdRef.current = resolvedActiveContextCompanyId;
      selectedCompanyModeRef.current = "company";
      setFormData((prev) => ({ ...prev, company_id: resolvedActiveContextCompanyId }));
      setCompanySelectionInitialized(true);
    }
  }, [companySelectionInitialized, selectedCompanyId, currentContextType, activeContextCompanyId, availableCompanies]);

  useEffect(() => {
    // If the active context is personal, or the selected ID explicitly matches
    // the personal host_id, ensure we operate in personal context.
    const isExplicitPersonalId = selectedCompanyId !== null && personalContextCompanyId !== null && Number(selectedCompanyId) === Number(personalContextCompanyId);

    if (currentContextType === "personal" || isExplicitPersonalId) {
      if (selectedCompanyId === null || isExplicitPersonalId) {
        if (selectedCompanyId !== null) {
          setSelectedCompanyId(null);
        }
        setFormData((prev) => ({ ...prev, company_id: null }));
        selectedCompanyModeRef.current = "personal";
      }
    }
  }, [currentContextType, selectedCompanyId, personalContextCompanyId]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Refresh user snapshot so bank details & stripe status are current
      let freshUser: any = null;
      try {
        const userResp = await getCurrentUser();
        freshUser = (userResp as any)?.data ?? userResp ?? null;
      } catch { /* ignore */ }

      const [typesData, invoiceData] = await Promise.all([
        getInvoiceTypes(),
        getInvoiceData(),
      ]);

      // Fetch clients — respect the current view scope.
      // "current" scope: only fetch for the active context (backend scopes by session).
      // "all" scope: fetch from every context and merge.
      const viewScope = getViewScope();
      let clientsData: Client[];

      // Use freshUser directly to get company list — availableCompaniesRef may be empty on first render
      const companiesSource = freshUser ?? normalizedTempUser ?? normalizedAuthUser ?? {};
      const rawCompanies = Array.isArray(companiesSource?.available_companies) ? companiesSource.available_companies : [];
      const companyIds = rawCompanies
        .map((c: any) => Number(c?.id ?? c?.company_id))
        .filter((id: number) => Number.isFinite(id) && id > 0);

      const companyNamesMap = new Map<number, string>();
      rawCompanies.forEach((c: any) => {
        const id = Number(c?.id ?? c?.company_id);
        if (Number.isFinite(id) && id > 0) {
          companyNamesMap.set(id, c?.company_name ?? c?.name ?? `Company #${id}`);
        }
      });

      if (viewScope === 'all') {

        if (companyIds.length === 0) {
          clientsData = await getInvoiceClients();
        } else {
          const originalType = currentContextTypeRef.current;
          const originalCompanyId = activeContextCompanyIdRef.current;

          const merged = new Map<number, Client & { _sourceAccount?: string }>();
          const pushUnique = (rows: Client[], sourceLabel: string) => {
            rows.forEach((client) => {
              const id = Number(client?.id);
              if (Number.isFinite(id) && id > 0 && !merged.has(id)) {
                merged.set(id, { ...client, _sourceAccount: sourceLabel });
              }
            });
          };

          const restoreOriginalContext = async () => {
            if (originalType === "company" && originalCompanyId) {
              await switchAccountContext({ type: "company", company_id: originalCompanyId });
            } else {
              await switchAccountContext({ type: "personal" });
            }
          };

          try {
            try {
              await switchAccountContext({ type: "personal" });
              pushUnique(await getInvoiceClients(), 'Personal');
            } catch (err) {
              console.warn('Failed to fetch personal clients in ALL-view, skipping', err);
            }

            for (const companyId of companyIds) {
              try {
                const companyName = companyNamesMap.get(companyId) || `Company #${companyId}`;
                await switchAccountContext({ type: "company", company_id: companyId });
                pushUnique(await getInvoiceClients(), companyName);
              } catch (err) {
                console.warn(`Failed to fetch clients for company ${companyId} in ALL-view, skipping`, err);
              }
            }
          } finally {
            await restoreOriginalContext().catch(() => undefined);
          }

          const allClients = Array.from(merged.values());
          clientsData = allClients.length > 0 ? allClients : await getInvoiceClients();
        }
      } else {
        // "current" scope: backend already scopes by active session context
        clientsData = await getInvoiceClients();
      }

      dispatch(setInvoiceTypes(typesData));
      dispatch(setClients(clientsData));


      if (!isEdit && !initialData?.code) {
        const defaultTypeId = getDefaultInvoiceTypeId(typesData);
        setFormData(prev => ({
          ...prev,
          code: invoiceData.invoice_code || "INV-0000",
          type_id: defaultTypeId,
          currency: DEFAULT_CURRENCY,
          status: DEFAULT_STATUS
        }));
      }

      setDataLoaded(true);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      toast.error("Failed to load invoice data");
    } finally {
      // setLoading(false);
    }
  }, [dispatch, isEdit, initialData?.code]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (canBillAnyCurrency || isView) return;
    setFormData((prev) =>
      prev.currency === lockedInvoiceCurrency
        ? prev
        : { ...prev, currency: lockedInvoiceCurrency },
    );
  }, [canBillAnyCurrency, lockedInvoiceCurrency, isView]);

  // Keep selected client valid if context switches and the client list changes.
  useEffect(() => {
    if (!formData.client_id) return;
    const existsInCurrentContext = clients.some(
      (client: Client) => client.id.toString() === formData.client_id
    );
    if (!existsInCurrentContext) {
      setFormData((prev) => ({ ...prev, client_id: "" }));
    }
  }, [clients, formData.client_id]);

  useEffect(() => {
    if (initialData && dataLoaded && clients.length > 0 && invoiceTypes.length > 0) {
      const clientId = resolveClientId(initialData, clients);
      const typeId = resolveInvoiceTypeId(initialData, invoiceTypes);

      if (initialData.pdf_type) {
        dispatch(setSelectedPdfTemplate(initialData.pdf_type));
      }

      const invoiceCurrency = initialData.items && initialData.items.length > 0
        ? initialData.items[0].currency
        : DEFAULT_CURRENCY;

      console.log('initial data', initialData);

      const transformedData = {
        code: initialData.code || "",
        client_id: clientId,
        type_id: typeId,
        currency: invoiceCurrency,
        status: (initialData.status as InvoiceStatus) || DEFAULT_STATUS,
        invoice_date: initialData.invoice_date ? new Date(initialData.invoice_date) : new Date(),
        due_date: initialData.due_date && initialData.due_date != null ? new Date(initialData.due_date) : null,
        items: sortItems((initialData.items || []).map((item) => ({
          ...item,
          custom_fields: Array.isArray(item.custom_fields) ? item.custom_fields : [],
        }))),
        total_amount: initialData.total_amount || 0,
        total_discount: initialData.total_discount || 0,
        total_vat: initialData.total_vat || 0,
        final_amount: initialData.final_amount || 0,
        quotation_title: initialData.quotation_title || "",
        quotation_content: initialData.quotation_content || "",
        payment_link: initialData.payment_link ?? false,
        notes: initialData.notes || "",
        bank_payment: initialData.bank_payment ?? false,
        client_utr: (initialData as any).client_utr || "",
        cis_tax_value: (initialData as any).cis_tax || 0,
        cis_enabled: (initialData as any).cis_enabled || false,
        company_id: null as number | null,
      };

      // Pre-select company if invoice has company_id (editing mode)
      if ((initialData as any).company_id) {
        const initialCompanyId = Number((initialData as any).company_id);
        const normalizedInitialCompanyId =
          Number.isFinite(initialCompanyId) && initialCompanyId > 0 ? initialCompanyId : null;
        transformedData.company_id = normalizedInitialCompanyId;
        setSelectedCompanyId(normalizedInitialCompanyId);
        selectedCompanyIdRef.current = normalizedInitialCompanyId;
        selectedCompanyModeRef.current = normalizedInitialCompanyId !== null ? "company" : "personal";
        setCompanySelectionInitialized(true);
      }

      // Load bank details from invoice when editing to prevent missing bank details warning
      if (isEdit && initialData.bank_payment && 
          (initialData as any).account_name && 
          (initialData as any).account_number && 
          (initialData as any).sort_code) {
        setBankDetailsOverride({
          account_name: (initialData as any).account_name,
          account_number: (initialData as any).account_number,
          sort_code: (initialData as any).sort_code,
        });
      }

      setFormData(transformedData);

      setLoading(false);
    } else if (!isView && !isEdit) {
      setLoading(false);
    }
  }, [initialData, dataLoaded, clients, invoiceTypes, dispatch, isEdit]);

  // ── When client changes, auto-populate UTR if CIS type is selected ─────────
  useEffect(() => {
    if (isCIS && formData.client_id) {
      const selectedClient = clients.find((c: Client) => c.id.toString() === formData.client_id);
      if (selectedClient && selectedClient.utr) {
        setFormData(prev => ({
          ...prev,
          client_utr: selectedClient.utr || ""
        }));
      }
    }
  }, [formData.client_id, isCIS, clients]);

  // ── Real-time invoice code (number) validation ──────────────────────────────
  const validateInvoiceCode = useCallback(async (codeValue: string) => {
    // Clear existing timeout
    if (codeValidationTimeoutRef.current) {
      clearTimeout(codeValidationTimeoutRef.current);
    }

    // If code is empty, no error
    if (!codeValue || !codeValue.trim()) {
      setCodeDuplicateError(null);
      setCodeValidating(false);
      setLastValidatedCode(null);
      setFieldErrors(prev => ({ ...prev, code: false }));
      return;
    }

    // Skip validation if this code was just validated
    if (lastValidatedCode === codeValue.trim()) {
      return;
    }

    // Set validating state
    setCodeValidating(true);

    // Debounce the validation check (wait 500ms after user stops typing)
    codeValidationTimeoutRef.current = setTimeout(async () => {
      try {
        // Determine company context for validation
        const latestSelectedCompanyId =
          selectedCompanyIdRef.current !== null
            ? selectedCompanyIdRef.current
            : selectedCompanyId;
        const selectedMode: "personal" | "company" =
          latestSelectedCompanyId !== null
            ? "company"
            : (selectedCompanyModeRef.current === "company" || currentContextType === "company"
              ? "company"
              : "personal");
        const formCompanyId =
          typeof formData.company_id === "number" && Number.isFinite(formData.company_id) && formData.company_id > 0
            ? formData.company_id
            : null;
        const resolvedCompanyId =
          selectedMode === "personal"
            ? personalContextCompanyId
            : (latestSelectedCompanyId ?? activeContextCompanyId ?? formCompanyId);

        // Check if code already exists (exclude current invoice if editing)
        const codeExists = await checkInvoiceCodeExists(
          codeValue.trim(),
          isEdit ? initialData?.id : undefined,
          resolvedCompanyId ?? undefined
        );

        if (codeExists) {
          setCodeDuplicateError(`Invoice number "${codeValue.trim()}" already exists. Please use a different number.`);
          setFieldErrors(prev => ({ ...prev, code: true }));
        } else {
          setCodeDuplicateError(null);
          setFieldErrors(prev => ({ ...prev, code: false }));
        }

        setLastValidatedCode(codeValue.trim());
      } catch (error) {
        console.error('Error validating invoice code:', error);
        // On error, clear validation to avoid blocking the user
        setCodeDuplicateError(null);
        setFieldErrors(prev => ({ ...prev, code: false }));
      } finally {
        setCodeValidating(false);
      }
    }, 500); // Debounce delay
  }, [
    selectedCompanyId,
    isEdit,
    initialData?.id,
    currentContextType,
    personalContextCompanyId,
    activeContextCompanyId,
    formData.company_id,
    lastValidatedCode,
  ]);

  const handleClientCreated = (newClient: Client) => {
    dispatch(addClient(newClient));
    setFormData(prev => ({
      ...prev,
      client_id: newClient.id.toString()
    }));
    setClientDialogOpen(false);
  };

  const validatePercentage = (value: number, fieldName: string): number => {
    if (value < 0) { console.warn(`${fieldName} cannot be negative. Setting to 0.`); return 0; }
    if (value > 100) { console.warn(`${fieldName} cannot exceed 100%. Setting to 100.`); return 100; }
    return value;
  };

  const calculateTotalFromPrice = (price: number, quantity: number, discount: number, vat: number) => {
    const validDiscount = validatePercentage(discount, 'Discount');
    const validVat = validatePercentage(vat, 'VAT');
    const subtotal = price * quantity;
    const discountAmount = subtotal * (validDiscount / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * (validVat / 100);
    const total = afterDiscount + vatAmount;
    return { subtotal, discountAmount, vatAmount, total };
  };

  const calculatePriceFromTotal = (total: number, quantity: number, discountPercent: number, vatPercent: number) => {
    if (total <= 0 || quantity <= 0) return 0;
    const validDiscountPercent = validatePercentage(discountPercent, 'Discount');
    const validVatPercent = validatePercentage(vatPercent, 'VAT');
    const priceAfterVat = total / (1 + validVatPercent / 100);
    const priceBeforeDiscount = priceAfterVat / (1 - validDiscountPercent / 100);
    const unitPrice = priceBeforeDiscount / quantity;
    return parseFloat(unitPrice.toFixed(2));
  };

  // ── CIS projects: simple total calculation (no VAT, no discount) ───────────
  const calculateCISProjectTotal = (price: number, quantity: number) => {
    return price * quantity;
  };

  const recalculateTotals = (items: InvoiceItem[]) => {
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let finalAmount = 0;

    items.forEach(item => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;

      if (isCIS) {
        // For CIS projects: no VAT, no discount
        const subtotal = price * quantity;
        totalAmount += subtotal;
        finalAmount += subtotal;
      } else {
        const discountPercent = validatePercentage(Number(item.discount) || 0, 'Discount');
        const vatPercent = validatePercentage(Number(item.vat) || 0, 'VAT');
        const subtotal = price * quantity;
        const discountAmount = subtotal * (discountPercent / 100);
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * (vatPercent / 100);
        totalAmount += subtotal;
        totalDiscount += discountAmount;
        totalVat += vatAmount;
        finalAmount += afterDiscount + vatAmount;
      }
    });

    return { total_amount: totalAmount, total_discount: totalDiscount, total_vat: totalVat, final_amount: finalAmount };
  };

  const getCalculatedTotal = () => {
    if (isCIS) {
      // For CIS projects: simple calculation
      return calculateCISProjectTotal(currentItem.price, currentItem.quantity);
    }

    if (lastChangedField === 'total' && currentItem.total > 0) return currentItem.total;
    const result = calculateTotalFromPrice(currentItem.price, currentItem.quantity, currentItem.discount, currentItem.vat);
    return result.total;
  };

  const getInlineCalculatedTotal = (item: InvoiceItem) => {
    if (isCIS) {
      // For CIS projects: simple calculation
      const price = Number(item.price) || 0;
      const quantity = item.type === "product" ? Number(item.quantity) || 1 : 1;
      return calculateCISProjectTotal(price, quantity);
    }

    if (lastChangedInlineField === 'total' && item.total && Number(item.total) > 0) return Number(item.total);
    const price = Number(item.price) || 0;
    const quantity = item.type === "product" ? Number(item.quantity) || 1 : 1;
    const discount = validatePercentage(Number(item.discount) || 0, 'Discount');
    const vat = validatePercentage(Number(item.vat) || 0, 'VAT');
    const result = calculateTotalFromPrice(price, quantity, discount, vat);
    return result.total;
  };

  const handleItemChange = (field: string, value: any) => {
    let parsedValue;
    if (field === 'price') {
      if (value === '') {
        setLastChangedField('price');
        setCurrentItem(prev => ({ ...prev, price: 0, total: 0 }));
        return;
      }
    }
    if (field === 'price') {
      const strValue = value.toString();
      if (strValue.includes('-')) return;
      const validPattern = /^(\d+(\.\d*)?|\.\d+)$/;
      if (!validPattern.test(strValue) || strValue.length > 12) return;
    }
    if (field === 'type') {
      parsedValue = value;
    } else if (field === 'project_reference') {
      parsedValue = value;
    } else if (value === '' || value === null || value === undefined) {
      parsedValue = value === '' ? '' : 0;
    } else {
      const num = parseFloat(value);
      parsedValue = isNaN(num) ? 0 : num;
    }

    if (field === 'discount' || field === 'vat') {
      if (typeof parsedValue === 'number') parsedValue = Math.min(100, Math.max(0, parsedValue));
    }

    const updatedItem = { ...currentItem, [field]: parsedValue };

    if (field === 'price') {
      setLastChangedField('price'); updatedItem.total = 0; setCurrentItem(updatedItem); return;
    }
    if (field === 'total' && !isCIS) {
      setLastChangedField('total');
      if (updatedItem.total > 0) {
        const quantity = updatedItem.type === 'product' ? (updatedItem.quantity || 1) : 1;
        const discountPercent = validatePercentage(updatedItem.discount || 0, 'Discount');
        const vatPercent = validatePercentage(updatedItem.vat || 0, 'VAT');
        updatedItem.price = calculatePriceFromTotal(updatedItem.total, quantity, discountPercent, vatPercent);
      }
      setCurrentItem(updatedItem); return;
    }
    if (field === 'discount' && !isCIS) {
      if (lastChangedField === 'total' && currentItem.total > 0) {
        const quantity = updatedItem.type === 'product' ? (updatedItem.quantity || 1) : 1;
        updatedItem.price = calculatePriceFromTotal(currentItem.total, quantity, validatePercentage(updatedItem.discount || 0, 'Discount'), validatePercentage(updatedItem.vat || 0, 'VAT'));
      }
      setCurrentItem(updatedItem); return;
    }
    if (field === 'vat' && !isCIS) {
      if (lastChangedField === 'total' && currentItem.total > 0) {
        const quantity = updatedItem.type === 'product' ? (updatedItem.quantity || 1) : 1;
        updatedItem.price = calculatePriceFromTotal(currentItem.total, quantity, validatePercentage(updatedItem.discount || 0, 'Discount'), validatePercentage(updatedItem.vat || 0, 'VAT'));
      }
      setCurrentItem(updatedItem); return;
    }
    if (field === 'quantity') {
      if (lastChangedField === 'total' && currentItem.total > 0 && !isCIS) {
        updatedItem.price = calculatePriceFromTotal(currentItem.total, updatedItem.quantity || 1, validatePercentage(updatedItem.discount || 0, 'Discount'), validatePercentage(updatedItem.vat || 0, 'VAT'));
      }
      setCurrentItem(updatedItem); return;
    }
    if (field === 'type') {
      if (value === 'service') updatedItem.quantity = 1;
      if (lastChangedField === 'total' && currentItem.total > 0 && !isCIS) {
        const quantity = value === 'product' ? (updatedItem.quantity || 1) : 1;
        updatedItem.price = calculatePriceFromTotal(currentItem.total, quantity, validatePercentage(updatedItem.discount || 0, 'Discount'), validatePercentage(updatedItem.vat || 0, 'VAT'));
      }
      setCurrentItem(updatedItem); return;
    }
    setCurrentItem(updatedItem);
  };

  // ── Sort items alphabetically by name (numbers first, then letters) ────────
  const sortItems = (items: InvoiceItem[]): InvoiceItem[] => {
    return [...items].sort((a, b) => {
      const nameA = a.name.trim().toLowerCase();
      const nameB = b.name.trim().toLowerCase();

      // Check if name starts with a number
      const startsWithNumberA = /^\d/.test(nameA);
      const startsWithNumberB = /^\d/.test(nameB);

      // Numbers come first
      if (startsWithNumberA && !startsWithNumberB) return -1;
      if (!startsWithNumberA && startsWithNumberB) return 1;

      // Both start with numbers or both start with letters - sort alphabetically
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const applyItemOrdering = (items: InvoiceItem[]): InvoiceItem[] => {
    return itemOrderMode === "alphabetical" ? sortItems(items) : items;
  };

  const addCustomFieldToCurrentItem = () => {
    if (customFieldsItemIndex === null) return;
    const key = customFieldKey.trim();
    const value = customFieldValue.trim();
    if (!key && !value) return;

    setFormData(prev => {
      const updatedItems = [...prev.items];
      const target = updatedItems[customFieldsItemIndex];
      if (!target) return prev;

      const nextFields = [...(target.custom_fields || []), { key, value }];
      updatedItems[customFieldsItemIndex] = { ...target, custom_fields: nextFields };
      const totals = recalculateTotals(updatedItems);
      return { ...prev, items: updatedItems, ...totals };
    });
    setCustomFieldKey("");
    setCustomFieldValue("");
  };

  const removeCustomFieldFromCurrentItem = (index: number) => {
    if (customFieldsItemIndex === null) return;
    setFormData(prev => {
      const updatedItems = [...prev.items];
      const target = updatedItems[customFieldsItemIndex];
      if (!target) return prev;

      const nextFields = (target.custom_fields || []).filter((_, i) => i !== index);
      updatedItems[customFieldsItemIndex] = { ...target, custom_fields: nextFields };
      const totals = recalculateTotals(updatedItems);
      return { ...prev, items: updatedItems, ...totals };
    });
  };

  const addOrUpdateItem = () => {
    const errors: string[] = [];
    if (!currentItem.name.trim()) errors.push("item name");
    if (currentItem.price <= 0) errors.push("price");
    if (isCIS && !currentItem.project_reference.trim()) errors.push("project reference");
    if (errors.length > 0) { toast.error(`Please fill in ${errors.join(" and ")}`); return; }

    let finalTotal: number;
    let discountAmount = 0;
    let vatAmount = 0;

    if (isCIS) {
      // For CIS projects: simple total, always quantity 1
      finalTotal = calculateCISProjectTotal(currentItem.price, 1);
    } else {
      const validDiscount = validatePercentage(currentItem.discount, 'Discount');
      const validVat = validatePercentage(currentItem.vat, 'VAT');
      const result = calculateTotalFromPrice(currentItem.price, currentItem.quantity, validDiscount, validVat);
      finalTotal = lastChangedField === 'total' && currentItem.total > 0 ? currentItem.total : result.total;
      discountAmount = result.discountAmount;
      vatAmount = result.vatAmount;
    }

    const newItem: InvoiceItem = {
      id: editingItemIndex !== null ? formData.items[editingItemIndex].id : Date.now(),
      name: currentItem.name.trim(),
      type: isCIS ? "service" : currentItem.type, // CIS projects are always service type
      currency: formData.currency,
      price: currentItem.price,
      quantity: isCIS ? 1 : (currentItem.type === "product" ? currentItem.quantity : null), // CIS always 1
      discount: isCIS ? 0 : validatePercentage(currentItem.discount, 'Discount'),
      discount_value: discountAmount,
      vat: isCIS ? 0 : validatePercentage(currentItem.vat, 'VAT'),
      vat_value: vatAmount,
      total: finalTotal,
      total_amount: finalTotal,
      project_reference: isCIS ? currentItem.project_reference : undefined,
      // When updating an existing item, preserve current custom fields even
      // if the panel UI doesn't edit them.
      custom_fields: (editingItemIndex !== null
        ? (formData.items[editingItemIndex]?.custom_fields || [])
        : (currentItem.custom_fields || [])
      )
        .filter((field) => field.key.trim() || field.value.trim())
        .map((field) => ({ key: field.key.trim(), value: field.value.trim() })),
    };

    let updatedItems: InvoiceItem[];
    if (editingItemIndex !== null) {
      updatedItems = formData.items.map((item, i) => (i === editingItemIndex ? newItem : item));
      toast.success("Item updated");
    } else {
      updatedItems = [...formData.items, newItem];
      toast.success("Item added");
    }

    // ── Sort items alphabetically by name (numbers first) ──────────────────────
    const sortedItems = applyItemOrdering(updatedItems);

    const totals = recalculateTotals(sortedItems);
    setFormData(prev => ({ ...prev, items: sortedItems, ...totals }));
    setCurrentItem({ type: "service", name: "", price: 0, quantity: 1, discount: 0, vat: 0, total: 0, project_reference: "", custom_fields: [] });
    setCustomFieldKey("");
    setCustomFieldValue("");
    setEditingItemIndex(null);
    setLastChangedField(null);
  };

  const startInlineEdit = (index: number) => {
    const item = formData.items[index];
    setTempItem({ ...item });
    setEditingRow(index);
    setLastChangedInlineField(null);
    setCustomFieldKey("");
    setCustomFieldValue("");
    setCurrentItem({ type: "service", name: "", price: 0, quantity: 1, discount: 0, vat: 0, total: 0, project_reference: "", custom_fields: [] });
    setEditingItemIndex(null);
    setLastChangedField(null);
  };

  const cancelInlineEdit = () => { setEditingRow(null); setTempItem(null); setLastChangedInlineField(null); };

  const saveInlineEdit = () => {
    if (editingRow === null || !tempItem) return;
    if (!tempItem.name.trim() || Number(tempItem.price) <= 0) { toast.error("Please fill in item name and price"); return; }
    if (isCIS && !tempItem.project_reference?.trim()) { toast.error("Please fill in project reference"); return; }

    const validDiscount = isCIS ? 0 : validatePercentage(Number(tempItem.discount) || 0, 'Discount');
    const validVat = isCIS ? 0 : validatePercentage(Number(tempItem.vat) || 0, 'VAT');
    const updatedTempItem = { ...tempItem, discount: validDiscount, vat: validVat };
    const total = getInlineCalculatedTotal(updatedTempItem);
    const updatedItem: InvoiceItem = { ...updatedTempItem, total: total, total_amount: total };
    const updatedItems = formData.items.map((item, i) => i === editingRow ? updatedItem : item);

    // ── Sort items after inline edit ──────────────────────
    const sortedItems = applyItemOrdering(updatedItems);
    const totals = recalculateTotals(sortedItems);
    setFormData(prev => ({ ...prev, items: sortedItems, ...totals }));
    setEditingRow(null); setTempItem(null); setLastChangedInlineField(null);
    toast.success("Item updated");
  };

  const handleInlineChange = (field: string, value: any) => {
    if (editingRow === null || !tempItem) return;
    setTempItem(prev => {
      if (!prev) return null;
      const updatedItem = { ...prev };
      if (field === 'type') {
        updatedItem.type = value;
        if (value === 'service') updatedItem.quantity = null;
        else if (value === 'product' && !updatedItem.quantity) updatedItem.quantity = 1;
        setLastChangedInlineField('type');
      } else if (field === 'name') {
        updatedItem.name = value;
      } else if (field === 'project_reference') {
        updatedItem.project_reference = value;
      } else if (field === 'price') {
        const numValue = value === '' ? 0 : parseFloat(value);
        updatedItem.price = isNaN(numValue) ? 0 : numValue;
        setLastChangedInlineField('price');
      } else if (field === 'quantity') {
        if (updatedItem.type === 'product') {
          const numValue = value === '' ? 1 : parseFloat(value);
          updatedItem.quantity = isNaN(numValue) ? 1 : numValue;
        }
        setLastChangedInlineField('quantity');
      } else if (field === 'discount' && !isCIS) {
        const numValue = value === '' ? 0 : parseFloat(value);
        updatedItem.discount = isNaN(numValue) ? 0 : Math.min(100, Math.max(0, numValue));
        setLastChangedInlineField('discount');
      } else if (field === 'vat' && !isCIS) {
        const numValue = value === '' ? 0 : parseFloat(value);
        updatedItem.vat = isNaN(numValue) ? 0 : Math.min(100, Math.max(0, numValue));
        setLastChangedInlineField('vat');
      } else if (field === 'total' && !isCIS) {
        const numValue = value === '' ? 0 : parseFloat(value);
        updatedItem.total = isNaN(numValue) ? 0 : numValue;
        setLastChangedInlineField('total');
        if (numValue > 0) {
          const quantity = updatedItem.type === 'product' ? Number(updatedItem.quantity) || 1 : 1;
          updatedItem.price = calculatePriceFromTotal(numValue, quantity, validatePercentage(Number(updatedItem.discount) || 0, 'Discount'), validatePercentage(Number(updatedItem.vat) || 0, 'VAT'));
        }
      }
      if (['price', 'quantity', 'discount', 'vat', 'type'].includes(field) && field !== 'total') {
        updatedItem.total = getInlineCalculatedTotal(updatedItem);
      }
      return updatedItem;
    });
  };

  const addInlineCustomField = () => {
    if (editingRow === null || !tempItem) return;
    const key = customFieldKey.trim();
    const value = customFieldValue.trim();
    if (!key && !value) return;

    setTempItem(prev => {
      if (!prev) return null;
      const next = [...(prev.custom_fields || []), { key, value }];
      return { ...prev, custom_fields: next };
    });
    setCustomFieldKey("");
    setCustomFieldValue("");
  };

  const removeInlineCustomField = (index: number) => {
    if (editingRow === null || !tempItem) return;
    setTempItem(prev => {
      if (!prev) return null;
      const next = (prev.custom_fields || []).filter((_, i) => i !== index);
      return { ...prev, custom_fields: next };
    });
  };

  const removeItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const totals = recalculateTotals(updatedItems);
    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
    toast.success("Item removed");
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.items.length) return;

    const updatedItems = [...formData.items];
    [updatedItems[index], updatedItems[targetIndex]] = [updatedItems[targetIndex], updatedItems[index]];
    const totals = recalculateTotals(updatedItems);
    setFormData(prev => ({ ...prev, items: updatedItems, ...totals }));
  };

  const handleOrderModeChange = (value: "alphabetical" | "custom") => {
    setItemOrderMode(value);

    if (value === "alphabetical") {
      setFormData(prev => {
        const sortedItems = sortItems(prev.items);
        const totals = recalculateTotals(sortedItems);
        return { ...prev, items: sortedItems, ...totals };
      });
    }
  };

  const editItem = (index: number) => {
    const item = formData.items[index];
    setCurrentItem({
      type: item.type,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      discount: validatePercentage(Number(item.discount) || 0, 'Discount'),
      vat: validatePercentage(Number(item.vat) || 0, 'VAT'),
      total: Number(item.total) || 0,
      project_reference: item.project_reference || "",
      custom_fields: Array.isArray(item.custom_fields) ? item.custom_fields : [],
    });
    setEditingItemIndex(index);
    setLastChangedField(null);
    if (editingRow !== null) cancelInlineEdit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({ client_id: false, type_id: false, code: false });

    let hasError = false;
    const newErrors = { client_id: false, type_id: false, code: false };

    if (!isDraft && (!formData.client_id || formData.client_id === "")) { newErrors.client_id = true; hasError = true; }
    if (!isDraft && (!formData.type_id || formData.type_id === "")) { newErrors.type_id = true; hasError = true; }

    // Check for real-time code validation errors
    if (!isDraft && fieldErrors.code) {
      newErrors.code = true;
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newErrors);
      if (newErrors.code) {
        toast.error("Please fix the invoice number error");
        document.getElementById('code')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (newErrors.client_id && newErrors.type_id) toast.error("Please select both client and invoice type");
      else if (newErrors.client_id) toast.error("Please select a client");
      else if (newErrors.type_id) toast.error("Please select an invoice type");
      setTimeout(() => {
        if (newErrors.code) document.getElementById('code')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (newErrors.client_id) document.getElementById('client-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else if (newErrors.type_id) document.getElementById('type-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    if (!isDraft && formData.items.length === 0) { toast.error("Please add at least one item"); return; }

    if (!isDraft && isCIS && !formData.client_utr?.trim()) {
      toast.warning("Client UTR is required for CIS invoices. Please add a UTR for the selected client.");
      return;
    }

    // ── Code validation: Real-time validation already checked for duplicates ──
    // The backend will also validate as a final fallback to ensure data integrity
    // Prevent submission if a real-time duplicate error exists
    if (!isDraft && codeDuplicateError) {
      setFieldErrors(prev => ({ ...prev, code: true }));
      toast.error("Please fix the duplicate invoice number before saving");
      document.getElementById('code')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const latestSelectedCompanyId =
      selectedCompanyIdRef.current !== null
        ? selectedCompanyIdRef.current
        : selectedCompanyId;
    const selectedMode: "personal" | "company" =
      latestSelectedCompanyId !== null
        ? "company"
        : (selectedCompanyModeRef.current === "company" || currentContextType === "company"
          ? "company"
          : "personal");
    const formCompanyId =
      typeof formData.company_id === "number" && Number.isFinite(formData.company_id) && formData.company_id > 0
        ? formData.company_id
        : null;
    const resolvedCompanyId =
      selectedMode === "personal"
        ? personalContextCompanyId
        : (latestSelectedCompanyId ?? activeContextCompanyId ?? formCompanyId);

    if (!resolvedCompanyId) {
      toast.error(
        selectedMode === "personal"
          ? "Personal invoice company id is missing. Please refresh account context and try again."
          : "Please select a valid invoice company"
      );
      return;
    }

    const submitData: InvoiceFormSubmitData = {
      ...formData,
      client_id: parseInt(formData.client_id),
      type_id: parseInt(formData.type_id),
      currency: formData.currency,
      invoice_date: format(formData.invoice_date, "yyyy-MM-dd"),
      due_date: formData.due_date ? format(formData.due_date, "yyyy-MM-dd") : null,
      status: isEdit ? formData.status : DEFAULT_STATUS,
      pdf_type: selectedPdfTemplate,
      quotation_title: formData.quotation_title || undefined,
      quotation_content: formData.quotation_content || undefined,
      bank_payment: formData.bank_payment,
      payment_link: formData.payment_link,
      // ── Include bank details when bank payment is enabled ──────────────────
      ...(formData.bank_payment && resolvedBank ? {
        account_name: resolvedBank.account_name,
        account_number: resolvedBank.account_number,
        sort_code: resolvedBank.sort_code,
      } : {}),
      // ── Include company address snapshot ──────────────────────────────────
      ...(resolvedCompanyAddress ? { company_address: resolvedCompanyAddress } : {}),
      // ── Include CIS fields when applicable ────────────────────────────────
      ...(isCIS && {
        cis_net: cisNet,
        client_utr: formData.client_utr || undefined,
        cis_tax: formData.cis_tax_value || undefined,
      }),
      // ── Company selector ─────────────────────────────────────────────────
      company_id: resolvedCompanyId ?? formCompanyId,
      all_accounts_view: getViewScope() === 'all',
    };

    onSubmit(submitData, isDraft);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingRow === null) return;
      if (e.key === 'Escape') cancelInlineEdit();
      else if (e.key === 'Enter' && e.ctrlKey) saveInlineEdit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingRow]);

  const selectedInvoiceTypeName = invoiceTypes.find(type => type.id.toString() === formData.type_id)?.name || "Select type";
  const isQuotation = invoiceTypes.length > 0 && formData.type_id ? isQuotationType(invoiceTypes, formData.type_id) : false;
  const isInvoiceType = !formData.type_id || (
    invoiceTypes.length > 0 &&
    invoiceTypes.find(type => type.id.toString() === formData.type_id)?.name === "Invoice"
  );

  // ── CIS calculations ───────────────────────────────────────────
  const effectiveCISRate = formData.cis_tax_value > 0 ? formData.cis_tax_value / 100 : CIS_RATE;
  const cisTax = isCIS ? parseFloat((formData.final_amount * effectiveCISRate).toFixed(2)) : 0
  const cisNet = isCIS ? parseFloat((formData.final_amount - cisTax).toFixed(2)) : 0

  // ---------------------------------------------------------------------------
  // Custom fields selection hooks MUST be above early returns
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (customFieldsItemIndex === null) return;
    if (customFieldsItemIndex < 0 || customFieldsItemIndex >= formData.items.length) {
      setCustomFieldsItemIndex(null);
    }
  }, [customFieldsItemIndex, formData.items.length]);

  // When items become available, default to the most recent item
  useEffect(() => {
    if (isView) return;
    if (formData.items.length === 0) {
      setCustomFieldsItemIndex(null);
      return;
    }
    if (customFieldsItemIndex === null) {
      setCustomFieldsItemIndex(formData.items.length - 1);
    }
  }, [formData.items.length, customFieldsItemIndex, isView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-foreground">Loading...</span>
      </div>
    );
  }

  if (isEdit && initialData && (!clients.length || !invoiceTypes.length)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <span className="text-foreground">Loading form data...</span>
          <p className="text-sm text-muted-foreground mt-2">
            Clients: {clients.length} | Types: {invoiceTypes.length} | Client ID: {formData.client_id || 'N/A'} | Type ID: {formData.type_id || 'N/A'}
          </p>
        </div>
      </div>
    );
  }

  const selectedClient = clients.find((c: Client) => c.id.toString() === formData.client_id);

  const handleClientUtrBlur = () => {
    if (!isCIS || !formData.client_id || !selectedClient) return;

    const enteredUtr = (formData.client_utr || "").trim();
    const existingUtr = (selectedClient.utr || "").trim();
    if (enteredUtr === existingUtr) return;

    // Store the pending value and open confirmation dialog
    setPendingUtrValue(enteredUtr);
    setUtrConfirmDialogOpen(true);
  };

  const confirmUtrUpdate = async () => {
    if (!selectedClient) return;
    setUtrConfirmDialogOpen(false);

    if (!selectedClient.name?.trim() || !selectedClient.email?.trim()) {
      toast.error("Cannot update client UTR from here because client name/email is missing. Please edit the client first.");
      setFormData((prev) => ({ ...prev, client_utr: selectedClient.utr || "" }));
      return;
    }

    try {
      setSavingClientUtr(true);
      const response = await http.put(`admin/invoices/clients/update/${selectedClient.id}`, {
        name: selectedClient.name,
        email: selectedClient.email,
        telephone: selectedClient.telephone || undefined,
        address: selectedClient.address || undefined,
        client_type: selectedClient.client_type || undefined,
        company_registration_number: selectedClient.company_registration_number || undefined,
        vat_number: selectedClient.vat_number || undefined,
        utr: pendingUtrValue || null,
        ...(getViewScope() === 'all' && selectedCompanyId !== null ? { company_id: selectedCompanyId } : {}),
        all_accounts_view: getViewScope() === 'all',
      });
      const updatedClient = (response as any)?.data?.data ?? (response as any)?.data;

      if (updatedClient) {
        dispatch(
          setClients(
            clients.map((client) =>
              client.id === selectedClient.id ? { ...client, ...updatedClient } : client
            )
          )
        );
        setFormData((prev) => ({ ...prev, client_utr: updatedClient.utr || pendingUtrValue || "" }));
      } else {
        setFormData((prev) => ({ ...prev, client_utr: pendingUtrValue || "" }));
      }
      toast.success("Client UTR updated successfully.");
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Failed to update client UTR";
      toast.error(message);
      setFormData((prev) => ({ ...prev, client_utr: selectedClient.utr || "" }));
    } finally {
      setSavingClientUtr(false);
    }
  };

  const cancelUtrUpdate = () => {
    setUtrConfirmDialogOpen(false);
    if (selectedClient) {
      setFormData((prev) => ({ ...prev, client_utr: selectedClient.utr || "" }));
    }
  };

  const calculatedTotal = getCalculatedTotal();
  const hasAnyCustomFields = formData.items.some(
    (item) => Array.isArray(item.custom_fields) && item.custom_fields.length > 0
  );
  const showCustomFieldsColumn = hasAnyCustomFields || (!isView && editingRow !== null);
  const customFieldsTargetItem =
    customFieldsItemIndex !== null ? formData.items[customFieldsItemIndex] : null;

  const handlePaymentLinkSwitch = (value: boolean) => {
    if (value && !isStripeConnected) {
      if (!canManagePaymentSettings) {
        // Sub-users cannot connect Stripe — only the account owner can.
        setStripeNotConnectedDialogOpen(true);
      } else {
        toast.error("Stripe is not connected for this account. Connect Stripe in Company Details to enable payment links.");
      }
      return;
    }
    setFormData(prev => ({ ...prev, payment_link: value }));
  };

  const handleConnectStripe = async () => {
    if (isView || stripeConnecting) return;
    setStripeConnecting(true);
    try {
      const latestSelectedCompanyId =
        selectedCompanyIdRef.current !== null
          ? selectedCompanyIdRef.current
          : selectedCompanyId;
      const targetContextType: "personal" | "company" =
        latestSelectedCompanyId !== null ? "company" : "personal";
      const targetCompanyId = targetContextType === "company" ? latestSelectedCompanyId : null;
      const shouldSwitchToTarget =
        (targetContextType === "personal" && currentContextType !== "personal") ||
        (targetContextType === "company" && (
          currentContextType !== "company" ||
          activeContextCompanyId !== targetCompanyId
        ));

      if (shouldSwitchToTarget) {
        if (targetContextType === "company" && targetCompanyId) {
          await switchAccountContext({ type: "company", company_id: targetCompanyId });
        } else {
          await switchAccountContext({ type: "personal" });
        }
      }

      const res = await http.post("admin/stripe/connect");
      const redirectLink = (res as any)?.data?.link || (res as any)?.data?.url;
      if (!redirectLink) {
        toast.error("Stripe connect link was not returned. Please try again.");
        return;
      }
      location.href = redirectLink;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error || "Failed to connect to Stripe. Please try again.";
      toast.error(message);
    } finally {
      setStripeConnecting(false);
    }
  };

  const handleBankPaymentSwitch = (value: boolean) => {
    bankAutoToggleHandledRef.current = true;

    if (!value) {
      setFormData(prev => ({ ...prev, bank_payment: false }));
      return;
    }

    // Turning ON requires bank details. Check synced details first (Stripe-like behavior).
    if (!hasBankDetails) {
      // Check if bank details are synced from settings
      const syncedBankDetails = loadBankDetailsFromSync(bankSyncScope);
      if (syncedBankDetails && areBankDetailsComplete(syncedBankDetails)) {
        setBankDetailsOverride(syncedBankDetails);
        setFormData(prev => ({ ...prev, bank_payment: true }));
        toast.success('Bank details loaded from Settings');
        return;
      }

      // Sub-users cannot add bank details — only the account owner can.
      if (!canManagePaymentSettings) {
        setParentBankDetailsMissingDialogOpen(true);
        setFormData(prev => ({ ...prev, bank_payment: false }));
        return;
      }

      // Owners/admins: prompt to enter bank details
      setBankDetailsDraft({
        account_name: resolvedBank?.account_name ?? "",
        account_number: resolvedBank?.account_number ?? "",
        sort_code: resolvedBank?.sort_code ?? "",
      });
      setBankDetailsDialogOpen(true);
      setFormData(prev => ({ ...prev, bank_payment: false }));
      return;
    }

    setFormData(prev => ({ ...prev, bank_payment: true }));
  };

  const saveBankDetailsFromDialog = async () => {
    const account_name = bankDetailsDraft.account_name.trim();
    const account_number = bankDetailsDraft.account_number.trim();
    const sort_code = bankDetailsDraft.sort_code.trim();

    if (!account_name || !account_number || !sort_code) {
      toast.error("Please fill Account name, Account number and Sort code.");
      return;
    }

    // Ensure backend context is the selected company so changeCompanyDetails
    // updates the company record. Capture current context locally so we
    // can always restore it reliably afterwards.
    let switchedContext = false;
    const originalSnapshot = originalContextSnapshotRef.current ?? { type: currentContextType, companyId: activeContextCompanyId };
    try {
      setBankDetailsSaving(true);
      const latestSelectedCompanyId = selectedCompanyIdRef.current !== null ? selectedCompanyIdRef.current : selectedCompanyId;
      const targetContextType: "personal" | "company" = latestSelectedCompanyId !== null ? "company" : "personal";
      const targetCompanyId = targetContextType === "company" ? latestSelectedCompanyId : null;
      const shouldSwitchToTarget =
        (targetContextType === "personal" && currentContextType !== "personal") ||
        (targetContextType === "company" && (
          currentContextType !== "company" ||
          activeContextCompanyId !== targetCompanyId
        ));

      if (shouldSwitchToTarget) {
        switchedContext = true;
        if (targetContextType === "company" && targetCompanyId) {
          await switchAccountContext({ type: "company", company_id: targetCompanyId });
        } else {
          await switchAccountContext({ type: "personal" });
        }
      }
      // Get current company address to preserve it when saving bank details
      const fallbackCompanyAddress =
        targetContextType === "company"
          ? (
            (selectedCompanyData?.company_address ?? "").toString().trim() ||
            (selectedCompanyUserSnapshot?.company?.company_address ?? "").toString().trim() ||
            (normalizedTempUser?.company?.company_address ?? "").toString().trim() ||
            (normalizedAuthUser?.company?.company_address ?? "").toString().trim() ||
            ""
          )
          : (
            (normalizedTempUser?.company?.company_address ?? "").toString().trim() ||
            (normalizedAuthUser?.company?.company_address ?? "").toString().trim() ||
            ""
          );
      const fallbackCompanyName =
        targetContextType === "company"
          ? (
            (selectedCompanyData?.company_name ?? "").toString().trim() ||
            (selectedCompanyUserSnapshot?.company?.company_name ?? "").toString().trim() ||
            (normalizedTempUser?.company?.company_name ?? "").toString().trim() ||
            (normalizedTempUser?.current_context?.company_name ?? "").toString().trim() ||
            (normalizedAuthUser?.company?.company_name ?? "").toString().trim() ||
            "Company"
          )
          : (
            `${(normalizedTempUser?.first_name ?? normalizedAuthUser?.first_name ?? "").toString().trim()} ${(normalizedTempUser?.last_name ?? normalizedAuthUser?.last_name ?? "").toString().trim()}`.trim() ||
            personalCompanyLabel ||
            "Personal"
          );

      // Try minimal payload first. Some accounts do not require company_name for bank-only updates.
      let response: any;
      try {
        response = await changeCompanyDetails({
          company_name: fallbackCompanyName,
          company_address: fallbackCompanyAddress || undefined,
          account_name,
          account_number,
          sort_code,
        });
      } catch (error: any) {
        const message = String(error?.message || "").toLowerCase();
        const needsCompanyName =
          message.includes("company name") ||
          message.includes("company_name");
        if (!needsCompanyName) throw error;

        // Retry with a stronger fallback company_name if backend enforces it.
        const refreshed = await getCurrentUser().catch(() => null as any);
        const refreshedUser = (refreshed as any)?.data ?? refreshed ?? {};
        const fallbackCompanyName =
          targetContextType === "company"
            ? (
              (refreshedUser?.company?.company_name ?? "").toString().trim() ||
              (selectedCompanyData?.company_name ?? "").toString().trim() ||
              (normalizedTempUser?.company?.company_name ?? "").toString().trim() ||
              (normalizedTempUser?.current_context?.company_name ?? "").toString().trim() ||
              (normalizedAuthUser?.company?.company_name ?? "").toString().trim() ||
              "Company"
            )
            : (
              `${(refreshedUser?.first_name ?? normalizedTempUser?.first_name ?? normalizedAuthUser?.first_name ?? "").toString().trim()} ${(refreshedUser?.last_name ?? normalizedTempUser?.last_name ?? normalizedAuthUser?.last_name ?? "").toString().trim()}`.trim() ||
              personalCompanyLabel ||
              "Personal"
            );

        response = await changeCompanyDetails({
          company_name: fallbackCompanyName,
          company_address: fallbackCompanyAddress || undefined,
          account_name,
          account_number,
          sort_code,
        });
      }

      const bank = (response as any)?.data?.bank ?? null;
      if (bank) {
        setBankDetailsOverride({
          account_name: bank.account_name ?? account_name,
          account_number: bank.account_number ?? account_number,
          sort_code: bank.sort_code ?? sort_code,
        });
      } else {
        setBankDetailsOverride({ account_name, account_number, sort_code });
      }

      // Sync bank details to localStorage for automatic cross-page sync (Stripe-like behavior)
      saveBankDetailsToSync({ account_name, account_number, sort_code }, bankSyncScope);

      // Refresh identity snapshot for the rest of the app when possible.
      try {
        await getCurrentUser();
      } catch {
        // ignore
      }

      toast.success("Bank details saved.");
      setBankDetailsDialogOpen(false);
      setFormData(prev => ({ ...prev, bank_payment: true }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save bank details";
      toast.error(message);
    } finally {
      // Restore original context if we switched it above
      try {
        if (switchedContext) {
          if (originalSnapshot && originalSnapshot.type === "company" && originalSnapshot.companyId) {
            await switchAccountContext({ type: "company", company_id: originalSnapshot.companyId });
          } else {
            await switchAccountContext({ type: "personal" });
          }
        }
      } catch {
        // ignore restore errors
      }
      setBankDetailsSaving(false);
    }
  };

  const handleCISToggle = (value: boolean) => {
    if (value) {
      // When enabling CIS toggle
      setFormData(prev => ({
        ...prev, cis_enabled: true,


        items: [], // Clear all CIS projects
        total_amount: 0,
        total_discount: 0,
        total_vat: 0,
        final_amount: 0,


      }));
    } else {
      // When disabling CIS toggle - clear all CIS-related data
      setFormData(prev => ({
        ...prev,
        cis_enabled: false,
        items: [], // Clear all CIS projects
        total_amount: 0,
        total_discount: 0,
        total_vat: 0,
        final_amount: 0,
        client_utr: "",
        cis_tax_value: 0,
      }));
      toast.info("CIS projects cleared when disabling CIS");
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full">
        <CreateClientDialog
          open={clientDialogOpen}
          onOpenChange={setClientDialogOpen}
          onClientCreated={handleClientCreated}
          trigger={<div className="hidden" />}
        />

        <form onSubmit={handleSubmit} className="w-full">
          <Dialog open={stripeNotConnectedDialogOpen} onOpenChange={setStripeNotConnectedDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stripe</DialogTitle>
              </DialogHeader>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Your parent account doesn&apos;t have Stripe connected.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Stripe payment links can only be used once the account owner connects Stripe. Please ask your account owner to connect Stripe in their Company Details settings.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setStripeNotConnectedDialogOpen(false)}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={parentBankDetailsMissingDialogOpen} onOpenChange={setParentBankDetailsMissingDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bank Details</DialogTitle>
              </DialogHeader>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Your parent account doesn&apos;t have bank details.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Bank payment can only be enabled once the account owner adds their bank details. Please ask your account owner to add bank details in their Company Details settings.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setParentBankDetailsMissingDialogOpen(false)}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={bankDetailsDialogOpen}
            onOpenChange={(open) => {
              if (bankDetailsSaving) return;
              setBankDetailsDialogOpen(open);
            }}
          >
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Bank Details</DialogTitle>
              </DialogHeader>
                <>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-medium">Please add your bank details first.</p>
                      <p className="mt-1 text-xs text-amber-800">
                        Add bank details here and save to continue with Bank payment.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Account name</Label>
                        <Input
                          value={bankDetailsDraft.account_name}
                          onChange={(e) =>
                            setBankDetailsDraft((p) => ({ ...p, account_name: e.target.value }))
                          }
                          placeholder="e.g. John Smith"
                          disabled={bankDetailsSaving}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account number</Label>
                        <Input
                          value={bankDetailsDraft.account_number}
                          onChange={(e) =>
                            setBankDetailsDraft((p) => ({ ...p, account_number: e.target.value }))
                          }
                          placeholder="e.g. 12345678"
                          disabled={bankDetailsSaving}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sort code</Label>
                        <Input
                          value={bankDetailsDraft.sort_code}
                          onChange={(e) =>
                            setBankDetailsDraft((p) => ({ ...p, sort_code: e.target.value }))
                          }
                          placeholder="e.g. 00-11-22"
                          disabled={bankDetailsSaving}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBankDetailsDialogOpen(false)}
                      disabled={bankDetailsSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={saveBankDetailsFromDialog}
                      disabled={bankDetailsSaving}
                    >
                      {bankDetailsSaving ? "Saving..." : "Save bank details"}
                    </Button>
                  </DialogFooter>
                </>
            </DialogContent>
          </Dialog>

          <AlertDialog open={utrConfirmDialogOpen} onOpenChange={(open) => { if (!open) cancelUtrUpdate(); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update Client UTR</AlertDialogTitle>
                <AlertDialogDescription>
                  Changing the Client UTR here will <strong>permanently</strong> update this client's record.
                  This change cannot be undone from here. Do you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelUtrUpdate}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmUtrUpdate}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Yes, Update UTR
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">

            <div className="space-y-4 order-2 xl:order-1">

              {/* Company Selector — only shown when "All-Accounts View" toggle is ON */}
              {showCompanySelector && availableCompanies.length > 0 && (
                <div className="space-y-1 p-3 sm:p-4 border rounded-lg bg-background">
                  <Label className="text-xs font-medium text-foreground">Invoice Company</Label>
                  <p className="text-xs text-muted-foreground mb-2">Select which company's branding and details to use for this invoice</p>
                  <Select
                    value={selectedCompanyId !== null ? selectedCompanyId.toString() : "personal"}
                    onValueChange={(val) => {
                      const nextId = val === "personal" ? null : parseInt(val, 10);
                      const normalizedNextId =
                        typeof nextId === "number" && Number.isFinite(nextId) && nextId > 0
                          ? nextId
                          : null;
                      setBankDetailsOverride(null);
                      setSelectedCompanyId(normalizedNextId);
                      selectedCompanyIdRef.current = normalizedNextId;
                      selectedCompanyModeRef.current = normalizedNextId !== null ? "company" : "personal";
                      setFormData((prev) => ({
                        ...prev,
                        company_id: normalizedNextId,
                      }));
                      setCompanySelectionInitialized(true);
                    }}
                    disabled={isView}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background text-foreground border-border w-full">
                      <SelectValue placeholder="Select company account" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border max-h-[200px]">
                      <SelectItem value="personal" className="text-xs">
                        {personalCompanyLabel}
                      </SelectItem>
                      {availableCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()} className="text-xs">
                          {company.company_name || `Company ${company.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompanyData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {[selectedCompanyData.business_email, selectedCompanyData.company_address]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {/* Payment toggles */}
              <div className="col-span-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-background">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Stripe Payment</Label>
                  <p className="text-xs text-muted-foreground">Add Stripe payment link with your invoice (Requires stripe connection)</p>
                </div>
                <Switch disabled={isView} checked={formData.payment_link} onCheckedChange={(value) => handlePaymentLinkSwitch(value)} />
              </div>

              {formData.payment_link && !isStripeConnected && (
                <div className="col-span-1 p-3 border rounded-lg border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-orange-900 dark:text-orange-200">Payment Integration (Stripe)</Label>
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        {!canManagePaymentSettings
                          ? `Your parent account doesn't have Stripe connected. Stripe payment links can only be used once the account owner connects Stripe. Please ask your account owner to connect Stripe in their Company Details settings.`
                          : selectedCompanyId !== null
                            ? `Stripe is not connected for the selected company account. Go to Company Details to connect Stripe and use payment links.`
                            : `Stripe is not connected for this account. Go to Personal Details to connect Stripe and use payment links.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-span-1 flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm font-medium">Bank payment</Label>
                  <p className="text-xs text-muted-foreground">Include your bank details for the client</p>
                  {isSubUser(normalizedTempUser ?? normalizedAuthUser) ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.bank_payment
                        ? `Using account holder's bank details: ${resolvedBank?.account_name ?? ''}`
                        : 'Turn on to include account holder\'s bank details on the invoice'}
                    </p>
                  ) : (
                    <>
                      {!formData.bank_payment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Turn on to include bank details on the invoice
                        </p>
                      )}
                      {formData.bank_payment && !hasBankDetails && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                          {selectedCompanyId !== null
                            ? `⚠ Bank details are missing for the selected company account. Switch to that company account and add bank details to display them on the invoice.`
                            : `⚠ Bank details are missing. Add account name, account number and sort code to display them on the invoice.`}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <Switch disabled={isView} checked={formData.bank_payment} onCheckedChange={(value) => handleBankPaymentSwitch(value)} />
              </div>

              {/* CIS Toggle - Only show when invoice type is "Invoice" */}
              {isInvoiceType && (
                <div className="col-span-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-background">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Construction Industry Scheme (CIS)</Label>
                    <p className="text-xs text-muted-foreground">Enable CIS tax deduction for construction projects</p>
                  </div>
                  <Switch
                    disabled={isView}
                    checked={formData.cis_enabled}
                    onCheckedChange={(value) => handleCISToggle(value)}
                  />
                </div>
              )}

              {/* Invoice Code and Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="code" className="text-xs font-medium text-foreground flex items-center gap-2">
                    Invoice Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, code: e.target.value }));
                        validateInvoiceCode(e.target.value);
                      }}
                      placeholder="INV-0000"
                      disabled={isView}
                      className={cn(
                        "h-9 text-sm bg-background text-foreground border-border",
                        fieldErrors.code && "border-red-500 bg-red-50 dark:bg-red-900/20"
                      )}
                    />
                    {codeValidating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin">
                          <Check className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  {codeDuplicateError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {codeDuplicateError}
                    </p>
                  )}
                </div>

                <div className="space-y-1 w-full">
                  <Label htmlFor="client" className="text-xs font-medium text-foreground">Client</Label>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="client-selector"
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-left font-normal h-9 text-xs sm:text-sm bg-background text-foreground border-border",
                          !formData.client_id && "text-muted-foreground",
                          fieldErrors.client_id && "border-red-500 bg-red-50 dark:bg-red-900/20"
                        )}
                        disabled={isView}
                        type="button"
                      >
                        {formData.client_id ? clients.find(c => c.id.toString() === formData.client_id)?.name || "Select client" : "Select client"}
                        <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] sm:min-w-[280px] p-0 bg-background border-border" align="start">
                      <div className="space-y-1">
                        <div className="overflow-y-auto max-h-[200px]">
                          {clients.map((client: any) => (
                            <button key={client.id} type="button"
                              onClick={() => { setFormData(prev => ({ ...prev, client_id: client.id.toString() })); setFieldErrors(prev => ({ ...prev, client_id: false })); setClientPopoverOpen(false); }}
                              className={cn("w-full text-left px-2 py-2 text-xs rounded hover:bg-muted transition-colors", formData.client_id === client.id.toString() ? "bg-muted font-semibold text-foreground" : "text-foreground")}
                            >
                              <span>{client.name}</span>
                              {client._sourceAccount && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground">({client._sourceAccount})</span>
                              )}
                            </button>
                          ))}
                          {clients.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground text-center">No clients yet</div>}
                        </div>
                        {!isView && (
                          <>
                            <div className="h-px bg-border my-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setClientDialogOpen(true)}
                              disabled={getViewScope() === 'all'}
                              className="w-full px-2 py-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={getViewScope() === 'all' ? 'Create New Client is disabled in All-Accounts view' : ''}
                            >
                              <Plus className="h-3 w-3" /> Create New Client
                            </Button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.client_id && <p className="text-xs text-red-500 mt-1">Please select a client</p>}
                </div>
              </div>

              {/* Invoice Type, Currency, Status */}
              <div className={`grid ${isEdit || isView ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
                <div className="space-y-1 w-full">
                  <Label htmlFor="type-selector" className="text-xs font-medium text-foreground">Invoice Type</Label>
                  <Select
                    value={formData.type_id}
                    onValueChange={(value) => {
                      const selectedType = invoiceTypes.find(t => t.id.toString() === value);
                      const wasCAIS = formData.type_id ? invoiceTypes.find(t => t.id.toString() === formData.type_id)?.name === CIS_TYPE_NAME : false;
                      const nowCIS = selectedType?.name === CIS_TYPE_NAME;
                      const isQuotationType = selectedType?.name === "Quotation";

                      // If switching between CIS and non-CIS, clear items/totals because the line-item model differs
                      if (wasCAIS !== nowCIS) {
                        setFormData(prev => ({
                          ...prev,
                          type_id: value,
                          items: [], // Clear items/projects when switching modes
                          total_amount: 0,
                          total_discount: 0,
                          total_vat: 0,
                          final_amount: 0,
                          client_utr: "",
                          cis_tax_value: 0,
                          quotation_title: "",
                          quotation_content: ""
                        }));
                        // Cancel any inline edits/custom-field input to avoid showing stale values
                        cancelInlineEdit();
                        setCustomFieldKey("");
                        setCustomFieldValue("");
                      }
                      // If switching to Quotation and CIS toggle is enabled, disable it
                      else if (isQuotationType && formData.cis_enabled) {
                        setFormData(prev => ({
                          ...prev,
                          type_id: value,
                          cis_enabled: false,
                          items: [], // Clear all CIS projects
                          total_amount: 0,
                          total_discount: 0,
                          total_vat: 0,
                          final_amount: 0,
                          client_utr: "",
                          cis_tax_value: 0,
                        }));
                        toast.info("CIS disabled when switching to Quotation type");
                      }
                      else {
                        setFormData(prev => ({ ...prev, type_id: value }));
                        if (selectedType?.name !== "Quotation") {
                          setFormData(prev => ({ ...prev, type_id: value, quotation_title: "", quotation_content: "" }));
                        }
                      }

                      setFieldErrors(prev => ({ ...prev, type_id: false }));
                    }}
                    disabled={isView}
                    required
                  >
                    <SelectTrigger id="type-selector" className={cn("h-9 text-xs bg-background text-foreground border-border w-full", fieldErrors.type_id && "border-red-500 bg-red-50 dark:bg-red-900/20")}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={4}
                      className="bg-popover border-border z-50"
                      style={{ maxHeight: '200px' }}
                    >
                      {invoiceTypes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No invoice types available</div>
                      ) : (
                        invoiceTypes.map((type: InvoiceType) => (
                          <SelectItem
                            key={type.id}
                            value={type.id.toString()}
                            className="text-foreground hover:bg-accent"
                          >
                            <span>{type.name}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.type_id && <p className="text-xs text-red-500 mt-1">Please select an invoice type</p>}
                </div>

                <div className="space-y-1 w-full">
                  <Label htmlFor="currency" className="text-xs font-medium text-foreground flex items-center gap-1">Currency</Label>
                  {canBillAnyCurrency || isView ? (
                    <CurrencyCombobox
                      value={formData.currency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                      disabled={isView}
                    />
                  ) : (
                    <Input
                      id="currency"
                      value={lockedInvoiceCurrency}
                      readOnly
                      disabled
                      className="h-9 text-xs bg-muted text-foreground border-border"
                    />
                  )}
                  {!canBillAnyCurrency && !isView && (
                    <p className="text-[11px] text-muted-foreground">
                      Your plan bills in company currency only ({lockedInvoiceCurrency}).
                    </p>
                  )}
                </div>

                {(isEdit || isView) && (
                  <div className="space-y-1 w-full">
                    <Label htmlFor="status" className="text-xs font-medium text-foreground">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as InvoiceStatus }))} disabled={isView} required>
                      <SelectTrigger className="h-9 text-xs bg-background text-foreground border-border w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={4}
                        className="bg-popover border-border z-50"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value} className="text-foreground hover:bg-accent">
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Invoice Date</Label>
                  <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 text-xs bg-background text-foreground border-border", !formData.invoice_date && "text-muted-foreground")} disabled={isView} type="button">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {formData.invoice_date ? format(formData.invoice_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[120] w-[320px] p-0 bg-background border-border shadow-xl"
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      avoidCollisions={false}
                    >
                        <Calendar
                          mode="single"
                          selected={formData.invoice_date}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, invoice_date: date }))}
                          initialFocus
                          weekStartsOn={1}
                          className="w-full"
                        />
                      </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 text-xs bg-background text-foreground border-border", !formData.due_date && "text-muted-foreground")} disabled={isView} type="button">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[120] w-[320px] p-0 bg-background border-border shadow-xl"
                      align="start"
                      side="bottom"
                      sideOffset={6}
                      avoidCollisions={false}
                    >
                      <Calendar
                        mode="single"
                        selected={formData.due_date ? formData.due_date : undefined}
                        onSelect={(date) => {
                          if (!date) return;
                          setFormData(prev => ({ ...prev, due_date: date }));
                        }}
                        initialFocus
                        weekStartsOn={1}
                        className="w-full p-4"
                        classNames={{
                          month_caption: "relative flex items-center justify-center h-8 mb-3",
                          caption_label: "text-[16px] font-semibold tracking-tight text-foreground",
                          nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                          button_previous: "h-8 w-8 rounded-lg border border-border bg-background p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                          button_next: "h-8 w-8 rounded-lg border border-border bg-background p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                          weekdays: "grid grid-cols-7 gap-1.5 mb-1",
                          weekday: "h-8 w-8 text-center text-[13px] font-medium text-slate-500",
                          weeks: "space-y-1.5",
                          week: "grid grid-cols-7 gap-1.5",
                          day: "h-9 w-9 p-0 text-[15px] font-medium text-foreground rounded-lg hover:bg-muted",
                          day_button: "h-9 w-9 p-0 text-[15px] font-medium rounded-lg",
                          day_today: "bg-muted text-foreground",
                          day_selected: "bg-teal-100 text-slate-900 hover:bg-teal-100 border border-teal-200",
                          day_outside: "text-slate-300 opacity-100",
                        }}
                      />
                      {!isView && (
                        <div className="flex items-center justify-between border-t border-border px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-[14px] font-semibold text-foreground hover:bg-transparent"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, due_date: null }));
                              setDueDatePopoverOpen(false);
                            }}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-[14px] font-semibold text-foreground hover:bg-transparent"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, due_date: addDays(new Date(), 30) }));
                              setDueDatePopoverOpen(false);
                            }}
                          >
                            +30 days
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* ── CIS-specific fields: UTR and CIS Tax Percentage ──────────────────── */}
              {isCIS && !isView && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <Label htmlFor="client_utr" className="text-xs font-medium text-foreground">Client UTR</Label>
                    <Input
                      id="client_utr"
                      value={formData.client_utr}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_utr: e.target.value }))}
                      onBlur={handleClientUtrBlur}
                      placeholder="Enter client UTR"
                      disabled={savingClientUtr || getViewScope() === 'all'}
                      className={cn(
                        "h-9 text-xs bg-background text-foreground border-border",
                        !formData.client_utr?.trim() && "border-amber-500 dark:border-amber-400"
                      )}
                    />
                    {getViewScope() === 'all' ? (
                      <p className="text-xs text-muted-foreground">
                        UTR editing is disabled in All-Accounts View. Please edit the client from the clients page.
                      </p>
                    ) : !formData.client_utr?.trim() ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠ Client UTR is required for CIS invoices. You cannot create this invoice without a UTR.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Auto-filled from client if available. Changing this value here updates the selected client permanently.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cis_tax_value" className="text-xs font-medium text-foreground">CIS Tax Percentage (%)</Label>
                    <Input
                      id="cis_tax_value"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.cis_tax_value || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, cis_tax_value: Math.min(100, Math.max(0, value)) }));
                      }}
                      placeholder="0"
                      className="h-9 text-xs bg-background text-foreground border-border"
                    />
                    <p className="text-xs text-muted-foreground">Optional: Manual CIS tax percentage override</p>
                  </div>
                </div>
              )}

              {/* Quotation view mode */}
              {isQuotation && isView && formData.quotation_title && (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border border-border rounded-lg bg-teal-50 dark:bg-teal-900/20">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">Quotation Note</h3>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Quotation Title</Label>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded border text-sm">{formData.quotation_title}</div>
                  </div>
                  {formData.quotation_content && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Quotation Content</Label>
                      <div className="p-2 bg-white dark:bg-gray-800 rounded border text-sm whitespace-pre-line">{formData.quotation_content}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items - Hidden for CIS, show Projects instead */}
              {!isCIS && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Add Items</h3>
                  </div>

                  {!isView && (
                    <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Type</Label>
                          <Select value={currentItem.type} onValueChange={(value) => handleItemChange('type', value)}>
                            <SelectTrigger className="h-9 text-xs bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-background border-border">
                              <SelectItem value="product" className="text-foreground">Product</SelectItem>
                              <SelectItem value="service" className="text-foreground">Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Description</Label>
                          <Input value={currentItem.name} onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))} placeholder="Item description" className="h-9 text-xs bg-background text-foreground border-border" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium">Price ({getCurrencySymbol(formData.currency)})</Label>
                          <Input type="number" step="0.01" min="0" value={currentItem.price === 0 ? "" : currentItem.price} onChange={(e) => handleItemChange('price', e.target.value)} placeholder="0.00" className="h-9 text-xs bg-background text-foreground border-border" />
                          {lastChangedField === 'total' && currentItem.total > 0 && currentItem.price > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">Calculated from total</p>
                          )}
                        </div>

                        {currentItem.type === "product" && (
                          <div className="space-y-1 min-w-0">
                            <Label className="text-xs font-medium">Qty</Label>
                            <Input type="number" min="1" value={currentItem.quantity || ""} onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }} onChange={(e) => handleItemChange('quantity', e.target.value)} placeholder="1" className="h-9 text-xs bg-background text-foreground border-border" />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium">Disc (%)</Label>
                          <Input type="number" min="0" max="100" step="0.1" value={currentItem.discount || ""}
                            onChange={(e) => { const value = e.target.value; if (value === '') { handleItemChange('discount', ''); } else { const num = parseFloat(value); if (!isNaN(num)) handleItemChange('discount', Math.min(100, Math.max(0, num))); } }}
                            placeholder="0" className="h-9 text-xs bg-background text-foreground border-border"
                            onBlur={(e) => { if (e.target.value !== '') { const num = parseFloat(e.target.value); if (!isNaN(num)) { const clamped = Math.min(100, Math.max(0, num)); if (clamped !== num) handleItemChange('discount', clamped); } } }} />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium">VAT (%)</Label>
                          <Input type="number" min="0" max="100" step="0.1" value={currentItem.vat || ""}
                            onKeyDown={(e) => { if (['e', 'E', '+', '-', ',', ' '].includes(e.key)) e.preventDefault(); }}
                            onPaste={(e) => { const pasted = e.clipboardData.getData('text'); if (!/^\d*\.?\d*$/.test(pasted)) e.preventDefault(); }}
                            onChange={(e) => { const value = e.target.value; if (value === '') { handleItemChange('vat', ''); } else { if (!/^\d*\.?\d*$/.test(value)) return; const num = parseFloat(value); if (!isNaN(num)) handleItemChange('vat', Math.min(100, Math.max(0, num))); } }}
                            placeholder="0" className="h-9 text-xs bg-background text-foreground border-border"
                            onBlur={(e) => { if (e.target.value !== '') { const num = parseFloat(e.target.value); if (!isNaN(num)) { const clamped = Math.min(100, Math.max(0, num)); if (clamped !== num) handleItemChange('vat', clamped); } } }} />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium">
                            Total ({getCurrencySymbol(formData.currency)})
                            {lastChangedField !== 'total' && calculatedTotal > 0 && <span className="ml-1 text-muted-foreground font-normal">(Auto)</span>}
                          </Label>
                          <Input type="number" step="0.01" min="0" value={currentItem.total || ""} onChange={(e) => handleItemChange('total', e.target.value)} placeholder={calculatedTotal > 0 ? calculatedTotal.toFixed(2) : "0.00"} className="h-9 text-xs bg-background text-foreground border-border font-semibold" />
                          {lastChangedField !== 'total' && calculatedTotal > 0 && <p className="text-xs text-muted-foreground truncate max-w-full">Auto: {formatCurrency(calculatedTotal, formData.currency)}</p>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button type="button" onClick={addOrUpdateItem} className="flex-1 h-8 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          {editingItemIndex !== null ? "Update Item" : "Add Item"}
                        </Button>
                        <ItemLibrary
                          onItemSelect={(item) => {
                            setCurrentItem({ type: item.type, name: item.name, price: Number(item.price), quantity: Number(item.quantity) || 1, discount: validatePercentage(Number(item.discount) || 0, 'Discount'), vat: validatePercentage(Number(item.vat) || 0, 'VAT'), total: Number(item.total) || 0, project_reference: "", custom_fields: [] });
                            setLastChangedField('price');
                          }}
                          currentCurrency={formData.currency}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CIS Projects Section (replaces normal items for CIS type) ─────── */}
              {isCIS && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Add Projects</h3>
                  </div>

                  {!isView && (
                    <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Project Reference *</Label>
                          <Input
                            value={currentItem.project_reference}
                            onChange={(e) => handleItemChange('project_reference', e.target.value)}
                            placeholder="Enter project reference"
                            className="h-9 text-xs bg-background text-foreground border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Description *</Label>
                          <Input value={currentItem.name} onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))} placeholder="Project description" className="h-9 text-xs bg-background text-foreground border-border" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Price ({getCurrencySymbol(formData.currency)}) *</Label>
                        <Input type="number" step="0.01" min="0" value={currentItem.price === 0 ? "" : currentItem.price} onChange={(e) => handleItemChange('price', e.target.value)} placeholder="0.00" className="h-9 text-xs bg-background text-foreground border-border" />
                      </div>

                      <Button type="button" onClick={addOrUpdateItem} className="w-full h-8 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        {editingItemIndex !== null ? "Update Project" : "Add Project"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Custom fields - always visible (above table) */}
              {!isView && (
                <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/50 hidden">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Custom Fields</h3>
                    <div className="text-xs text-muted-foreground">
                      {editingRow !== null
                        ? "Editing in table row"
                        : formData.items.length === 0
                          ? "Add an item/project first"
                          : customFieldsTargetItem?.custom_fields?.length
                            ? `${customFieldsTargetItem.custom_fields.length} field(s)`
                            : "No fields yet"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Select item</Label>
                      <Select
                        value={customFieldsItemIndex === null ? "" : customFieldsItemIndex.toString()}
                        onValueChange={(value) => {
                          const parsed = parseInt(value, 10);
                          if (Number.isNaN(parsed)) setCustomFieldsItemIndex(null);
                          else setCustomFieldsItemIndex(parsed);
                        }}
                        disabled={formData.items.length === 0 || editingRow !== null}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background text-foreground border-border">
                          <SelectValue placeholder="Choose an item" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {formData.items.length === 0 ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                              No items yet
                            </div>
                          ) : (
                            formData.items.map((item, index) => {
                              const label = isCIS
                                ? `${item.project_reference || "Project"} - ${item.name}`
                                : item.name;
                              return (
                                <SelectItem key={item.id || index} value={index.toString()}>
                                  <span className="truncate">{label || `Item ${index + 1}`}</span>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Key / Value</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 min-w-0">
                        <Input
                          value={customFieldKey}
                          onChange={(e) => setCustomFieldKey(e.target.value)}
                          placeholder="Key (e.g. PO Number)"
                          className="h-9 text-xs bg-background text-foreground border-border"
                          disabled={editingRow !== null}
                        />
                        <Input
                          value={customFieldValue}
                          onChange={(e) => setCustomFieldValue(e.target.value)}
                          placeholder="Value"
                          className="h-9 text-xs bg-background text-foreground border-border"
                          disabled={editingRow !== null}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCustomFieldToCurrentItem}
                          disabled={customFieldsItemIndex === null || formData.items.length === 0 || editingRow !== null}
                          className="h-9 text-xs"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {customFieldsTargetItem && editingRow === null && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-foreground">Current fields</Label>
                      {Array.isArray(customFieldsTargetItem.custom_fields) &&
                        customFieldsTargetItem.custom_fields.length > 0 ? (
                        <div className="space-y-1">
                          {customFieldsTargetItem.custom_fields.map((field, idx) => (
                            <div
                              key={`${field.key}-${idx}`}
                              className="flex items-center justify-between gap-2 text-xs p-2 border border-border rounded bg-background"
                            >
                              <div className="min-w-0">
                                <div className="truncate">
                                  <span className="font-medium">{field.key || "Key"}:</span>{" "}
                                  {field.value || "Value"}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCustomFieldFromCurrentItem(idx)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No custom fields added for this item yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Inline Edit Summary */}
              {editingRow !== null && tempItem && (
                <div className="mt-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-teal-600 dark:text-teal-400 font-medium">Editing:</span>
                        <span className="ml-2 font-semibold">{tempItem.name}</span>
                        {isCIS && tempItem.project_reference && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Project Reference: {tempItem.project_reference}
                          </div>
                        )}
                        {!isCIS && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {lastChangedInlineField === 'total' && Number(tempItem.total) > 0
                              ? <span className="text-green-600 dark:text-green-400">✓ Price calculated from total</span>
                              : <span>✓ Total calculated from price</span>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {!isCIS && (
                        <div className="text-xs text-muted-foreground">
                          {tempItem.discount ? `Discount: ${tempItem.discount}%` : ''}
                          {tempItem.vat ? ` | VAT: ${tempItem.vat}%` : ''}
                        </div>
                      )}
                      <div className="font-bold text-teal-600 dark:text-teal-400">
                        Total: {formatCurrency(getInlineCalculatedTotal(tempItem), formData.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items/Projects Table */}
              <div className="flex items-center justify-end gap-2">
                <Label className="text-xs font-medium text-foreground">Item order</Label>
                <Select value={itemOrderMode} onValueChange={(value: "alphabetical" | "custom") => handleOrderModeChange(value)} disabled={isView}>
                  <SelectTrigger className="h-8 w-[180px] text-xs bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="alphabetical">Alphabetical (default)</SelectItem>
                    <SelectItem value="custom">Custom order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-border rounded-lg overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {isCIS && <TableHead className="text-foreground whitespace-nowrap">Project Reference</TableHead>}
                      <TableHead className="text-foreground whitespace-nowrap">Description</TableHead>
                      {showCustomFieldsColumn && false && <TableHead className="text-foreground whitespace-nowrap">Custom Fields</TableHead>}

                      {!isCIS && <TableHead className="text-center text-foreground">Type</TableHead>}
                      <TableHead className="text-right text-foreground">Price</TableHead>
                      {!isCIS && <TableHead className="text-right text-foreground">Qty</TableHead>}
                      {!isCIS && <TableHead className="text-right text-foreground">Disc %</TableHead>}
                      {!isCIS && <TableHead className="text-right text-foreground">VAT %</TableHead>}
                      <TableHead className="text-right text-foreground">Total</TableHead>
                      {!isView && <TableHead className="text-center text-foreground">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={item.id || index} className={`hover:bg-muted/50 ${editingRow === index ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-500' : ''}`}>

                        {isCIS && (
                          <TableCell className="text-foreground">
                            {editingRow === index ? (
                              <Input value={tempItem?.project_reference || ""} onChange={(e) => handleInlineChange('project_reference', e.target.value)} className="h-10 sm:h-8 text-xs sm:text-sm bg-background text-foreground border-border" placeholder="Project reference" />
                            ) : (
                              item.project_reference || "-"
                            )}
                          </TableCell>
                        )}


                        <TableCell className="font-medium text-foreground whitespace-nowrap">
                          {editingRow === index ? <Input value={tempItem?.name || ""} onChange={(e) => handleInlineChange('name', e.target.value)} className="h-10 sm:h-8 text-xs sm:text-sm bg-background text-foreground border-border" placeholder="Item description" /> : item.name}
                        </TableCell>
                        {showCustomFieldsColumn && false && (
                          <TableCell className="text-foreground align-top min-w-[180px]">
                            {editingRow === index ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 min-w-0">
                                  <Input
                                    value={customFieldKey}
                                    onChange={(e) => setCustomFieldKey(e.target.value)}
                                    placeholder="Key"
                                    className="h-8 text-xs bg-background text-foreground border-border"
                                  />
                                  <Input
                                    value={customFieldValue}
                                    onChange={(e) => setCustomFieldValue(e.target.value)}
                                    placeholder="Value"
                                    className="h-8 text-xs bg-background text-foreground border-border"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addInlineCustomField}
                                    className="h-8 text-xs"
                                  >
                                    Add
                                  </Button>
                                </div>

                                {Array.isArray(tempItem?.custom_fields) && tempItem!.custom_fields!.length > 0 ? (
                                  <div className="space-y-1">
                                    {tempItem!.custom_fields!.map((field, fieldIndex) => (
                                      <div
                                        key={`${field.key}-${fieldIndex}`}
                                        className="flex items-center justify-between gap-2 text-[11px] p-1 border border-border rounded"
                                      >
                                        <span className="truncate">
                                          <span className="font-medium">{field.key || "Key"}:</span>{" "}
                                          {field.value || "Value"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeInlineCustomField(fieldIndex)}
                                          className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            ) : (
                              Array.isArray(item?.custom_fields) && item.custom_fields!.length > 0 ? (
                                <div className="space-y-1">
                                  {item.custom_fields!.map((field, fieldIndex) => (
                                    <div key={`${field.key}-${fieldIndex}`} className="text-[11px] leading-4">
                                      <span className="font-medium">{field.key || "Key"}:</span> {field.value || "Value"}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )
                            )}
                          </TableCell>
                        )}

                        {!isCIS && (
                          <TableCell className="text-center">
                            {editingRow === index ? (
                              <Select
                                value={tempItem?.type || "service"}
                                onValueChange={(value) => handleInlineChange('type', value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  sideOffset={4}
                                  className="bg-popover border-border z-50"
                                >
                                  <SelectItem value="product" className="text-foreground hover:bg-accent">Product</SelectItem>
                                  <SelectItem value="service" className="text-foreground hover:bg-accent">Service</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs capitalize border-border text-foreground">{item.type}</Badge>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right text-foreground max-w-[120px]">
                          {editingRow === index ? <Input type="number" step="0.01" min="0" value={tempItem?.price === 0 ? "" : tempItem?.price} onChange={(e) => handleInlineChange('price', e.target.value)} className="h-8 text-xs w-24 text-right" placeholder="0.00" /> : <span className="block truncate" title={formatCurrency(item.price, formData.currency)}>{formatCurrency(item.price, formData.currency)}</span>}
                        </TableCell>
                        {!isCIS && (
                          <TableCell className="text-right text-foreground">
                            {editingRow === index ? <Input type="number" min="1" value={tempItem?.quantity || ""} onChange={(e) => handleInlineChange('quantity', e.target.value)} className="h-8 text-xs w-16 text-right" placeholder="1" disabled={tempItem?.type === "service"} /> : (item.quantity || 1)}
                          </TableCell>
                        )}
                        {!isCIS && (
                          <TableCell className="text-right text-foreground">
                            {editingRow === index ? (
                              <Input type="number" min="0" max="100" step="0.1" value={tempItem?.discount || ""} onChange={(e) => { const value = e.target.value; if (value === '') { handleInlineChange('discount', ''); } else { const num = parseFloat(value); if (!isNaN(num)) handleInlineChange('discount', Math.min(100, Math.max(0, num))); } }} className="h-8 text-xs w-16 text-right" placeholder="0" />
                            ) : (Number(item.discount || 0) > 0 ? `${item.discount}%` : '-')}
                          </TableCell>
                        )}
                        {!isCIS && (
                          <TableCell className="text-right text-foreground">
                            {editingRow === index ? (
                              <Input type="number" min="0" max="100" step="0.1" value={tempItem?.vat || ""} onChange={(e) => { const value = e.target.value; if (value === '') { handleInlineChange('vat', ''); } else { const num = parseFloat(value); if (!isNaN(num)) handleInlineChange('vat', Math.min(100, Math.max(0, num))); } }} className="h-8 text-xs w-16 text-right" placeholder="0" />
                            ) : (Number(item.vat || 0) > 0 ? `${item.vat}%` : '-')}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold text-foreground max-w-[140px]">
                          {editingRow === index ? (
                            <div className="flex flex-col items-end">
                              {isCIS ? (
                                <div className="text-xs font-semibold">{formatCurrency(getInlineCalculatedTotal(tempItem as InvoiceItem), formData.currency)}</div>
                              ) : (
                                <>
                                  <Input type="number" step="0.01" min="0" value={tempItem?.total || ""} onChange={(e) => handleInlineChange('total', e.target.value)} className="h-8 text-xs w-24 text-right font-semibold" placeholder="0.00" />
                                  {lastChangedInlineField !== 'total' && tempItem && Number(tempItem.total) > 0 && <span className="text-xs text-muted-foreground mt-1">Auto-calculated</span>}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="block truncate" title={formatCurrency(item.total || item.total_amount || 0, formData.currency)}>{formatCurrency(item.total || item.total_amount || 0, formData.currency)}</span>
                          )}
                        </TableCell>
                        {!isView && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {editingRow === index ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button type="button" variant="ghost" size="sm" onClick={saveInlineEdit} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/20"><Check className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Save Changes (Ctrl+Enter)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button type="button" variant="ghost" size="sm" onClick={cancelInlineEdit} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"><X className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Cancel (Esc)</TooltipContent>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => startInlineEdit(index)} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-teal-600 hover:text-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/20"><Pencil className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Edit Item</TooltipContent>
                                  </Tooltip>
                                  {/* Custom fields are added from the bottom section */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20"><Trash2 className="h-3 w-3" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Delete Item</TooltipContent>
                                  </Tooltip>
                                  {itemOrderMode === "custom" && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, "up")} disabled={index === 0} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-foreground hover:bg-muted disabled:opacity-40">
                                            <ArrowUp className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Move Up</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, "down")} disabled={index === formData.items.length - 1} className="h-10 w-10 sm:h-8 sm:w-8 p-0 text-foreground hover:bg-muted disabled:opacity-40">
                                            <ArrowDown className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">Move Down</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {formData.items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={(isCIS ? (!isView ? 5 : 4) : (!isView ? 8 : 7)) + (showCustomFieldsColumn ? 1 : 0)}
                          className="text-center py-6 text-muted-foreground text-xs"
                        >
                          {isCIS ? "No projects added yet." : "No items added yet."} {!isView && <>Add {isCIS ? "projects" : "items"} using the form above.</>}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Custom fields block moved above the table */}

              {/* Quotation Fields */}
              {isQuotation && !isView && (
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border border-border rounded-lg bg-teal-50 dark:bg-teal-900/20">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">Quotation Note</h3>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Quotation Title</Label>
                    <Input value={formData.quotation_title} onChange={(e) => setFormData(prev => ({ ...prev, quotation_title: e.target.value }))} placeholder="Enter quotation title" className="h-9 text-xs bg-background text-foreground border-border" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Quotation Content</Label>
                    <Textarea value={formData.quotation_content} onChange={(e) => setFormData(prev => ({ ...prev, quotation_content: e.target.value }))} placeholder="Enter quotation content/description" className="min-h-[100px] text-xs bg-background text-foreground border-border resize-none" />
                  </div>
                </div>
              )}

              {/* ── CIS Tax Deduction Block ──────────────────────────────────────── */}
              {isCIS && formData.final_amount > 0 && (
                <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 border border-border bg-muted/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    CIS Tax Deduction ({formData.cis_tax_value > 0 ? formData.cis_tax_value : Math.round(CIS_RATE * 100)}%)
                  </h3>

                  <div className="space-y-1.5 text-xs">
                    {/* Subtotal before CIS */}
                    <div className="flex items-center justify-between text-foreground">
                      <span className="text-muted-foreground">Subtotal (before CIS)</span>
                      <span className="font-medium">{formatCurrency(formData.final_amount, formData.currency)}</span>
                    </div>

                    {/* CIS deduction */}
                    <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                      <span className="font-medium">CIS Deduction ({formData.cis_tax_value > 0 ? formData.cis_tax_value : Math.round(CIS_RATE * 100)}%)</span>
                      <span className="font-medium">− {formatCurrency(cisTax, formData.currency)}</span>
                    </div>

                    <div className="border-t border-border pt-1.5" />

                    {/* Net payable */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Net Amount Payable (after CIS)</span>
                      <span className="font-bold text-foreground text-sm">{formatCurrency(cisNet, formData.currency)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                    Under the Construction Industry Scheme, {formData.cis_tax_value > 0 ? formData.cis_tax_value : Math.round(CIS_RATE * 100)}% tax is deducted at source from the total invoice amount.
                  </p>
                </div>
              )}

              {/* Submit buttons */}
              {!isView && (
                <div className="flex flex-col sm:flex-row gap-3">

                  <Button type="submit" className="w-full sm:flex-1 h-10 text-sm text-primary border-primary" variant="outline" disabled={isSubmitting} onClick={() => setIsDraft(true)}>
                    Save Draft
                  </Button>
                  <Button type="submit" className="w-full sm:flex-1 h-10 text-sm" disabled={isSubmitting || formData.items.length === 0 || (formData.payment_link && !isStripeConnected)} onClick={() => setIsDraft(false)}>
                    {isSubmitting && !isDraft
                      ? (isEdit ? "Updating..." : "Creating...")
                      : (isEdit ? formData.status == "Draft" ? "Create Invoice" : "Update Invoice" : "Create Invoice")
                    }
                  </Button>
                </div>
              )}
            </div>

            {/* Right Side - PDF Preview */}
            <div className="order-1 xl:order-2 min-h-[300px] sm:min-h-[400px] h-auto">
              <PDFPreview
                invoiceData={{
                  code: formData.code,
                  client: selectedClient || null,
                  type_id: parseInt(formData.type_id) || null,
                  currency: formData.currency,
                  invoice_date: format(formData.invoice_date, "yyyy-MM-dd"),
                  due_date: formData.due_date ? format(formData.due_date, "yyyy-MM-dd") : null,
                  items: formData.items,
                  total_amount: formData.total_amount,
                  total_discount: formData.total_discount,
                  total_vat: formData.total_vat,
                  final_amount: formData.final_amount,
                  status: formData.status,
                  quotation_title: formData.quotation_title || null,
                  quotation_content: formData.quotation_content || null,
                  bank_payment: formData.bank_payment,
                  payment_link: formData.payment_link,
                  // Pass current bank details so PDF preview uses live values, not stale Redux data
                  ...(formData.bank_payment && resolvedBank ? {
                    account_name: resolvedBank.account_name,
                    account_number: resolvedBank.account_number,
                    sort_code: resolvedBank.sort_code,
                  } : {}),
                  // Pass CIS data to PDF preview if needed
                  ...(isCIS && {
                    cis_tax: cisTax,
                    cis_net: cisNet,
                    client_utr: formData.client_utr,
                    cis_tax_value: formData.cis_tax_value
                  }),
                }}
                invoiceTypes={invoiceTypes}
                isViewMode={isView}
                tempUser={effectiveTempUser as any}
              />
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}