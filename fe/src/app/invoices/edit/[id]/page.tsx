// app/app/invoices/edit/[id]/page.tsx - UPDATED WITH QUOTATION FIELDS
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { RootState, AppDispatch } from "@/slices/store";
import { getInvoice, updateInvoice, getInvoiceTypes, getInvoiceClients, saveOrUpdateDraftInvoice } from "@/services/invoice.service";
import {
  setCurrentInvoice,
  updateInvoice as updateInvoiceInState,
  setLoading,
  setError,
  clearError,
  initializePdfSettings,
  setSelectedPdfTemplate,
  setInvoiceTypes,
  setClients,
  setPdfThemeColor
} from "@/slices/invoiceSlice";
import { setAuthUser, setFullUser } from "@/slices/authSlice";
import { InvoiceForm, InvoiceFormSubmitData } from "@/components/invoice/InvoiceForm";
import { InvoiceActionButtons } from "@/components/invoice/InvoiceActionButtons";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { toast } from "sonner";
import { getViewScope } from "@/utils/view-scope";
import { InvoiceStatus, InvoiceItem, InvoiceItemRequest, DEFAULT_CURRENCY, DEFAULT_STATUS, StoreDraftInvoiceRequest } from "@/services/interface/invoice";
import { MailDialog } from "@/components/invoice/MailDialog";
import { getCurrentUser, switchAccountContext, changeCompanyDetails } from "@/services/service";
import { User } from "@/services/interface/User";

export default function EditInvoicePage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = parseInt(params.id as string);
  const contextType = searchParams.get("context");
  const contextCompanyId = Number(searchParams.get("company_id"));

  const { currentInvoice, loading, error, selectedPdfTemplate, clients, invoiceTypes } = useSelector((state: RootState) => state.invoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceLoaded, setInvoiceLoaded] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [accessWarning, setAccessWarning] = useState<string | null>(null);

  const [tempUser, setTempUser] = useState<User>();
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const personalContextCompanyId = useMemo(() => {
    const sourceUser: any = tempUser ?? {};
    const rawPersonalId = Number(
      sourceUser?.personal_company_id ??
      sourceUser?.host_id ??
      (sourceUser?.current_context?.type === "personal" ? sourceUser?.current_context?.host_id : null) ??
      sourceUser?.id
    );
    return Number.isFinite(rawPersonalId) && rawPersonalId > 0 ? rawPersonalId : null;
  }, [tempUser]);

  const canEditCurrentInvoice = useMemo(() => {
    if (!currentInvoice || !tempUser) return false;

    const isSubUserEdit = (tempUser as any)?.can_manage_company_profile === false;
    const currentType: "personal" | "company" =
      (tempUser as any)?.current_context?.type === "company" ? "company" : "personal";
    const currentCompanyRaw = Number(
      (tempUser as any)?.current_context?.company_id ?? (tempUser as any)?.active_company_id
    );
    const currentCompanyId =
      Number.isFinite(currentCompanyRaw) && currentCompanyRaw > 0 ? currentCompanyRaw : null;

    const invoiceCompanyRaw = Number((currentInvoice as any)?.company_id);
    const invoiceCompanyId =
      Number.isFinite(invoiceCompanyRaw) && invoiceCompanyRaw > 0 ? invoiceCompanyRaw : null;
    const treatAsPersonal =
      !!invoiceCompanyId &&
      !!personalContextCompanyId &&
      invoiceCompanyId === personalContextCompanyId;
    const effectiveInvoiceCompanyId = treatAsPersonal ? null : invoiceCompanyId;

    // Sub-users: forced to company context but operate under the parent's host.
    // Allow editing invoices scoped to their shared host when no specific company is active.
    if (isSubUserEdit && !currentCompanyId) {
      return treatAsPersonal || !effectiveInvoiceCompanyId;
    }

    return effectiveInvoiceCompanyId
      ? currentType === "company" && currentCompanyId === effectiveInvoiceCompanyId
      : currentType === "personal";
  }, [currentInvoice, tempUser, personalContextCompanyId]);

  type ContextSnapshot = { type: 'personal' | 'company'; companyId: number | null };

  const getContextSnapshot = (me: any): ContextSnapshot => {
    const type: 'personal' | 'company' =
      me?.current_context?.type === 'company' ? 'company' : 'personal';
    const rawCompanyId = Number(me?.current_context?.company_id ?? me?.active_company_id);
    const companyId = Number.isFinite(rawCompanyId) && rawCompanyId > 0 ? rawCompanyId : null;
    return { type, companyId };
  };

  const restoreContext = async (snapshot: ContextSnapshot) => {
    await switchAndConfirmContext(snapshot);
    // Force frontend identity refresh so sidebar/profile stays in original context.
    const latestMeResponse = await getCurrentUser();
    const latestMe = (latestMeResponse as any)?.data ?? latestMeResponse;
    if (latestMe) {
      dispatch(setAuthUser(latestMe));
      dispatch(setFullUser(latestMe));
    }
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const sameContext = (a: ContextSnapshot, b: ContextSnapshot) =>
    a.type === b.type && (a.type === 'personal' || a.companyId === b.companyId);

  const switchAndConfirmContext = async (target: ContextSnapshot) => {
    const initialMeResponse = await getCurrentUser();
    const initialMe = (initialMeResponse as any)?.data ?? initialMeResponse;
    if (sameContext(getContextSnapshot(initialMe), target)) return;

    if (target.type === 'company' && target.companyId) {
      await switchAccountContext({ type: 'company', company_id: target.companyId });
    } else {
      await switchAccountContext({ type: 'personal' });
    }

    for (let i = 0; i < 2; i++) {
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      if (sameContext(getContextSnapshot(me), target)) return;
      await wait(80);
    }
  };

  const fetchInvoiceFast = async (clientsData?: any[], typesData?: any[]) => {
    return await getInvoice(id, {
      clients: clientsData,
      invoiceTypes: typesData,
      skipReferenceData: !(clientsData && typesData),
    });
  };

  const buildContextCandidates = (me: any): ContextSnapshot[] => {
    const seen = new Set<string>();
    const push = (candidate: ContextSnapshot, list: ContextSnapshot[]) => {
      const key = `${candidate.type}:${candidate.companyId ?? "none"}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(candidate);
      }
    };

    const candidates: ContextSnapshot[] = [];

    if (contextType === "company" && Number.isFinite(contextCompanyId) && contextCompanyId > 0) {
      push({ type: "company", companyId: contextCompanyId }, candidates);
    } else if (contextType === "personal") {
      push({ type: "personal", companyId: null }, candidates);
    }

    push(getContextSnapshot(me), candidates);
    push({ type: "personal", companyId: null }, candidates);

    const companyIds = (Array.isArray(me?.available_companies) ? me.available_companies : [])
      .filter((c: any) => c?.is_active !== false)
      .map((c: any) => Number(c?.id ?? c?.company_id))
      .filter((cid: number) => Number.isFinite(cid) && cid > 0);

    for (const companyId of companyIds) {
      push({ type: "company", companyId }, candidates);
    }

    return candidates;
  };

  const findInvoiceAcrossContexts = async (
    candidates: ContextSnapshot[]
  ): Promise<{ context: ContextSnapshot; invoice: any } | null> => {
    for (const candidate of candidates) {
      try {
        await switchAndConfirmContext(candidate);
        const invoice = await fetchInvoiceFast();
        return { context: candidate, invoice };
      } catch (error) {
        if (!isNotFoundError(error)) {
          // Keep trying other contexts to avoid hard failure on transient context calls.
        }
        // Continue checking next candidate context
      }
    }
    return null;
  };

  const isNotFoundError = (err: any): boolean => {
    const status = Number(err?.response?.status);
    const msg = String(err?.message || '').toLowerCase();
    return status === 404 || msg.includes('resource not found');
  };

  useEffect(() => {
    async function getUser() {

      try {
        const response = await getCurrentUser();
        const me = (response as any)?.data ?? response;
        setTempUser(me);

        if (me?.invoice_theme_color) {
          dispatch(setPdfThemeColor(me.invoice_theme_color));
        }


      } catch (e) {
        console.error("Error fetching current user:", e);
      }

    }
    getUser();

  }, [dispatch])

  useEffect(() => {
    const handleContextChange = async () => {
      try {
        const response = await getCurrentUser();
        const me = (response as any)?.data ?? response;
        setTempUser(me);
      } catch (e) {
        console.error("Error refreshing user on context change:", e);
      }
    };
    window.addEventListener('account-context-changed', handleContextChange);
    return () => window.removeEventListener('account-context-changed', handleContextChange);
  }, []);

  useEffect(() => {
    const apply = () => setShowCompanySelector(getViewScope() === "all");
    apply();
    window.addEventListener("viewScopeChanged", apply as any);
    return () => window.removeEventListener("viewScopeChanged", apply as any);
  }, []);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => {
        setUpdateSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess]);

  useEffect(() => {
    dispatch(initializePdfSettings());
  }, [dispatch]);

  const loadAllData = useCallback(async () => {
    let originalContext: ContextSnapshot | null = null;
    let contextChanged = false;
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      setAccessWarning(null);
      setUpdateSuccess(false);
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      originalContext = getContextSnapshot(me);
      const requestedContext: ContextSnapshot | null =
        contextType === "company" && Number.isFinite(contextCompanyId) && contextCompanyId > 0
          ? { type: "company", companyId: contextCompanyId }
          : contextType === "personal"
            ? { type: "personal", companyId: null }
            : null;

      if (requestedContext && !sameContext(originalContext, requestedContext)) {
        await switchAndConfirmContext(requestedContext).catch(() => undefined);
        contextChanged = true;
      }

      let invoice: any;
      try {
        // Fast path: fetch invoice details first in the preferred context.
        invoice = await fetchInvoiceFast();
      } catch (detailError) {
        if (!isNotFoundError(detailError)) throw detailError;

        // Only run expensive scan when preferred context fetch returns 404
        const candidates = buildContextCandidates(me);
        const foundInContext = await findInvoiceAcrossContexts(candidates);
        if (!foundInContext) throw detailError;

        invoice = foundInContext.invoice;
        if (!sameContext(originalContext, foundInContext.context)) {
          contextChanged = true;
        }
      }

      // Load supporting data after context is resolved and invoice is found.
      const [clientsData, typesData] = await Promise.all([
        getInvoiceClients(),
        getInvoiceTypes()
      ]);

      dispatch(setClients(clientsData));
      dispatch(setInvoiceTypes(typesData));
      setDataReady(true);

      let resolvedClientId = invoice.client_id;
      let resolvedTypeId = invoice.type_id;

      if (!resolvedClientId && invoice.client && typeof invoice.client === 'string') {
        const matchingClient = clientsData.find(c => c.name === invoice.client);
        if (matchingClient) {
          resolvedClientId = matchingClient.id;
        }
      }

      if (!resolvedTypeId && invoice.invoice_type) {
        const matchingType = typesData.find(t => t.name === invoice.invoice_type);
        if (matchingType) {
          resolvedTypeId = matchingType.id;
        }
      }

      invoice.client_id = resolvedClientId;
      invoice.type_id = resolvedTypeId;

      if (invoice.pdf_type) {
        dispatch(setSelectedPdfTemplate(invoice.pdf_type));
      }

      dispatch(setCurrentInvoice(invoice));
      setInvoiceLoaded(true);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load invoice";
      dispatch(setError(errorMessage));
      toast.error("Failed to load invoice");
    } finally {
      dispatch(setLoading(false));
      if (originalContext && contextChanged) {
        restoreContext(originalContext).catch((restoreError) => {
          console.error('Failed to restore original context:', restoreError);
        });
      }
    }
  }, [id, dispatch, contextType, contextCompanyId]);

  useEffect(() => {
    if (id && !isNaN(id)) {
      loadAllData();
    }
  }, [id, loadAllData]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (data: InvoiceFormSubmitData, isDraft: boolean = false) => {
    setIsSubmitting(true);
    dispatch(clearError());
    setUpdateSuccess(false);

    try {
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      const currentType: "personal" | "company" =
        me?.current_context?.type === "company" ? "company" : "personal";
      const currentCompanyRaw = Number(me?.current_context?.company_id ?? me?.active_company_id);
      const currentCompanyId =
        Number.isFinite(currentCompanyRaw) && currentCompanyRaw > 0 ? currentCompanyRaw : null;

      const invoiceCompanyRaw = Number(currentInvoice?.company_id ?? data.company_id);
      const invoiceCompanyId =
        Number.isFinite(invoiceCompanyRaw) && invoiceCompanyRaw > 0 ? invoiceCompanyRaw : null;
      const rawPersonalCompanyId = Number(
        me?.personal_company_id ??
        me?.host_id ??
        (me?.current_context?.type === "personal" ? me?.current_context?.host_id : null) ??
        me?.id
      );
      const personalCompanyId =
        Number.isFinite(rawPersonalCompanyId) && rawPersonalCompanyId > 0 ? rawPersonalCompanyId : null;
      const treatAsPersonal =
        !!invoiceCompanyId &&
        !!personalCompanyId &&
        invoiceCompanyId === personalCompanyId;
      const effectiveInvoiceCompanyId = treatAsPersonal ? null : invoiceCompanyId;
      const isSubUserSubmit = (me as any)?.can_manage_company_profile === false;
      const hasEditAccess = (isSubUserSubmit && !currentCompanyId)
        ? (treatAsPersonal || !effectiveInvoiceCompanyId)
        : (effectiveInvoiceCompanyId
            ? currentType === "company" && currentCompanyId === effectiveInvoiceCompanyId
            : currentType === "personal");

      if (!hasEditAccess) {
        throw new Error("Switch to the invoice owner account to edit this invoice");
      }

      if (isDraft) {
        // console.log(
        //   'before save', data
        // );
        const draftPayload: Partial<StoreDraftInvoiceRequest> = {
          client_id: data.client_id ? Number(data.client_id) : undefined,
          type_id: data.type_id ? Number(data.type_id) : undefined,
          invoice_code: data.code || undefined,
          invoice_date: data.invoice_date || undefined,
          due_date: data.due_date || undefined,
          pdf_type: data.pdf_type || selectedPdfTemplate || undefined,
          status: "Draft",
          quotation_title: data.quotation_title || undefined,
          quotation_content: data.quotation_content || undefined,
          total_amount: parseFloat(data.total_amount.toString()),
          total_vat: data.total_vat ? parseFloat(data.total_vat.toString()) : null,
          total_discount: data.total_discount ? parseFloat(data.total_discount.toString()) : null,
          final_amount: parseFloat(data.final_amount.toString()),
          items: data.items?.length
            ? data.items.map(item => ({
              name: item.name,
              type: item.type,
              project_reference: item.project_reference || undefined,
              custom_fields: Array.isArray(item.custom_fields)
                ? item.custom_fields
                  .filter((f) => f?.key?.trim() || f?.value?.trim())
                  .map((f) => ({ key: f.key?.trim() || "", value: f.value?.trim() || "" }))
                : [],
              currency: item.currency || DEFAULT_CURRENCY,
              price: parseFloat(item.price.toString()) || undefined,
              quantity: item.type === "product" ? parseFloat(item.quantity?.toString() || "1") : undefined,
              discount: item.discount ? parseFloat(item.discount.toString()) : undefined,
              discount_value: item.discount_value ? parseFloat(item.discount_value.toString()) : undefined,
              vat: item.vat ? parseFloat(item.vat.toString()) : undefined,
              vat_value: item.vat_value ? parseFloat(item.vat_value.toString()) : undefined,
              total_amount: parseFloat(item.total?.toString() || item.total_amount?.toString() || "0")
            }))
            : undefined,
          cis_tax: data.cis_tax,
          cis_enabled: data.cis_enabled,
          client_utr: data.client_utr ?? null,
          company_id: data.company_id ?? undefined,
          bank_payment: data.bank_payment ?? false,
          payment_link: data.payment_link ?? false,
        };

        // Remove undefined fields
        Object.keys(draftPayload).forEach(
          key => draftPayload[key as keyof typeof draftPayload] === undefined &&
            delete draftPayload[key as keyof typeof draftPayload]
        );

        const updatedDraft = await saveOrUpdateDraftInvoice(id, draftPayload);

        // dispatch(updateInvoiceInState(updatedDraft));
        // dispatch(setCurrentInvoice(updatedDraft));

        toast.success("Draft saved successfully");
        return;
      }
      dispatch(setLoading(true));

      // If bank_payment is enabled, ensure bank details are persisted to the
      // current context's profile so the backend can find them in the correct table.
      // (Personal → user_banks, Company → invoices_companies)
      if (data.bank_payment && data.account_name) {
        try {
          const companyName =
            (me?.company?.company_name ?? "").trim() ||
            (me?.current_context?.company_name ?? "").trim() ||
            `${(me?.first_name ?? "").toString().trim()} ${(me?.last_name ?? "").toString().trim()}`.trim() ||
            "Personal";
          await changeCompanyDetails({
            company_name: companyName,
            account_name: data.account_name,
            account_number: data.account_number,
            sort_code: data.sort_code,
          });
        } catch (e) {
          console.warn('Failed to pre-save bank details before invoice update:', e);
          // Proceed anyway — the invoice update may still succeed
        }
      }

      const items: InvoiceItemRequest[] = data.items.map((item: any, index: number) => {
        const price = parseFloat(item.price.toString()) || 0;
        const quantity = item.type === "product" ? parseFloat(item.quantity?.toString() || "1") : 1;
        const discountPercent = item.discount ? parseFloat(item.discount.toString()) : 0;
        const vatPercent = item.vat ? parseFloat(item.vat.toString()) : 0;

        const subtotal = price * quantity;
        const discountAmount = subtotal * (discountPercent / 100);
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = afterDiscount * (vatPercent / 100);
        const totalAmount = afterDiscount + vatAmount;

        console.log('items', item);


        return {
          name: item.name || `Item ${index + 1}`,
          type: item.type || 'service',
          currency: data.currency || DEFAULT_CURRENCY,
          price: price,
          quantity: quantity,
          discount: discountPercent || null,
          discount_value: discountAmount || null,
          vat: vatPercent || null,
          vat_value: vatAmount || null,
          total_amount: totalAmount,
          project_reference: item?.project_reference ?? null,
          custom_fields: Array.isArray(item.custom_fields)
            ? item.custom_fields
              .filter((f: any) => f?.key?.trim() || f?.value?.trim())
              .map((f: any) => ({ key: (f.key || "").toString().trim(), value: (f.value || "").toString().trim() }))
            : [],



        };
      });

      if (!items || items.length === 0) {
        throw new Error("Please add at least one item to the invoice");
      }

      const pdfType = data.pdf_type || selectedPdfTemplate || 'classic';

      // Get invoice type name to check if it's a quotation
      const invoiceType = invoiceTypes.find(type => type.id.toString() === data.type_id.toString());
      const isQuotation = invoiceType?.name === "Quotation";

      const normalizedStatus: InvoiceStatus =
        data.status === 'Draft'
          ? ('Created' as InvoiceStatus)
          : (data.status as InvoiceStatus) || DEFAULT_STATUS;

      if (!data.code) {
        throw new Error("Please add Invoice Code");
      }
      const updatePayload = {
        client_id: parseInt(data.client_id.toString()),
        company_id: data.company_id ?? null,
        type_id: parseInt(data.type_id.toString()),
        invoice_date: data.invoice_date,
        invoice_code: data.code,
        due_date: data.due_date,
        items: items,
        total_amount: parseFloat(data.total_amount.toString()),
        total_vat: data.total_vat ? parseFloat(data.total_vat.toString()) : 0,
        total_discount: data.total_discount ? parseFloat(data.total_discount.toString()) : 0,
        final_amount: parseFloat(data.final_amount.toString()),
        status: normalizedStatus || DEFAULT_STATUS,
        pdf_type: pdfType,
        quotation_title: isQuotation ? data.quotation_title : undefined,  // Only include for quotations
        quotation_content: isQuotation ? data.quotation_content : undefined, // Only include for quotations
        payment_link: data.payment_link,
        bank_payment: data.bank_payment,
        ...(data.bank_payment ? {
          account_name: data.account_name,
          account_number: data.account_number,
          sort_code: data.sort_code,
        } : {}),
        cis_enabled: data.cis_enabled ?? false,
        cis_tax: data.cis_tax,
        client_utr: data.client_utr,
        all_accounts_view: data.all_accounts_view ?? false,
      };

      const updatedInvoice = await updateInvoice(id, updatePayload);

      dispatch(updateInvoiceInState(updatedInvoice));
      dispatch(setCurrentInvoice(updatedInvoice));

      setUpdateSuccess(true);
      toast.success(`${isQuotation ? 'Quotation' : 'Invoice'} ${updatedInvoice.code} updated successfully!`);

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: unknown) {
      let errorMessage = "Failed to update invoice";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // ── Duplicate invoice code error: show helpful message ──
      const isDuplicateCodeError = error instanceof Error 
        ? (error.message.includes("already exists") || error.message.includes("invoice number"))
        : false;
      
      if (isDuplicateCodeError) {
        dispatch(setError("This invoice number already exists. Please use a different number."));
        toast.error("This invoice number already exists for this company. Please change the invoice number and try again.", {
          duration: 5000,
        });
      } else {
        dispatch(setError(errorMessage));
        toast.error(`${data.status == "Draft" && !isDraft ? 'Failed to create invoice' : 'Failed to update invoice'}:\n${errorMessage}`, { style: { whiteSpace: "pre-line" } });
      }
    } finally {
      dispatch(setLoading(false));
      setIsSubmitting(false);
    }
  };

  const handleViewAll = () => {
    router.push("/invoices");
  };

  if (loading && !invoiceLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                  <p className="mt-4 text-lg dark:text-white">Loading invoice data...</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {!dataReady ? "Loading clients and types..." : "Loading invoice..."}
                  </p>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (accessWarning) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="max-w-2xl mx-auto mt-10 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6">
                <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  Access from another account is blocked
                </h2>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  {accessWarning}
                </p>
                <Button onClick={handleViewAll} className="mt-4">
                  Back to Invoices
                </Button>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentInvoice) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white text-primary">Edit Invoice</h1>
                <Button variant="outline" onClick={handleViewAll} className="h-9">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 dark:bg-red-900/20 dark:border-red-800">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error loading invoice
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <Button onClick={loadAllData} variant="outline" size="sm">
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if ((!currentInvoice || currentInvoice.id !== id)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white text-primary">Edit Invoice</h1>
                <Button variant="outline" onClick={handleViewAll} className="h-9">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="text-center py-10">
                <p className="text-lg text-gray-600 dark:text-gray-400">Invoice not found</p>
                <Button onClick={handleViewAll} className="mt-4">
                  Back to Invoices
                </Button>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (!dataReady || clients.length === 0 || invoiceTypes.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                  <p className="mt-4 text-lg dark:text-white">Preparing form data...</p>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  if (currentInvoice && tempUser && !canEditCurrentInvoice) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="max-w-2xl mx-auto mt-10 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
                  Access denied for this invoice
                </h2>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  Switch to the invoice owner account to edit this invoice.
                </p>
                <Button onClick={handleViewAll} className="mt-4">
                  Back to Invoices
                </Button>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
          <main className="flex-1 p-4 sm:p-6">
            <div className="container mx-auto py-4 sm:py-6">

              {/* Header */}
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-white">
                    Edit {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}
                  </h1>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'} Code:{" "}
                    <span className="font-medium">{currentInvoice.code}</span>
                  </p>

                  {currentInvoice.quotation_title && (
                    <p className="mt-1 text-sm text-teal-600 dark:text-teal-400">
                      Title: {currentInvoice.quotation_title}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <InvoiceActionButtons
                    invoiceId={currentInvoice.id}
                    companyId={currentInvoice.company_id}
                    invoiceCode={currentInvoice.code}
                    onMailClick={() => setMailDialogOpen(true)}
                    disabled={false}
                  />

                  <Button
                    variant="outline"
                    onClick={handleViewAll}
                    className="h-10 sm:h-9 w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>

              {/* Success alert */}
              {updateSuccess && (
                <Alert className="relative mb-6 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />

                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pr-10 sm:pr-8">
                      <div>
                        <strong>Success!</strong>{" "}
                        {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}{" "}
                        {currentInvoice.code} has been updated.
                      </div>
                    </div>
                  </AlertDescription>

                  <button
                    onClick={() => setUpdateSuccess(false)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 flex items-center justify-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Alert>
              )}

              {/* Form */}
              <div className={updateSuccess ? "pointer-events-none opacity-50" : ""}>
                <InvoiceForm
                  initialData={currentInvoice}
                  onSubmit={handleSubmit}
                  isEdit={true}
                  isSubmitting={isSubmitting}
                  tempUser={tempUser}
                  showCompanySelector={showCompanySelector}
                />
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>

      <MailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        invoice={currentInvoice}
        clients={clients}
        invoiceTypes={invoiceTypes}
      />
    </div>
  );
}