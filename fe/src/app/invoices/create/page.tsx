// app/app/invoices/create/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState, AppDispatch } from "@/slices/store";
import { createInvoice, getInvoiceData, saveOrUpdateDraftInvoice } from "@/services/invoice.service";
import { setLoading, setError, clearError, initializePdfSettings, setPdfThemeColor } from "@/slices/invoiceSlice";
import { InvoiceForm, InvoiceFormSubmitData } from "@/components/invoice/InvoiceForm";
import { InvoiceActionButtons } from "@/components/invoice/InvoiceActionButtons";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { X, Loader2, CheckCircle2, Plus, Edit, AlertTriangle } from "lucide-react";
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { toast } from "sonner";
import { InvoiceItem, InvoiceItemRequest, Invoice, DEFAULT_CURRENCY, DEFAULT_STATUS, StoreDraftInvoiceRequest } from "@/services/interface/invoice";
import { MailDialog } from "@/components/invoice/MailDialog";
import { getCurrentUser, switchAccountContext, changeCompanyDetails, parseApiError } from "@/services/service";
import { isPlanRestrictionError } from "@/lib/plan-access";
import { User } from "@/services/interface/User";
import { AlertDialog } from "@radix-ui/react-alert-dialog";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getViewScope } from "@/utils/view-scope";

export default function CreateInvoicePage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const { loading, error, selectedPdfTemplate, clients, invoiceTypes } = useSelector((state: RootState) => state.invoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [tempUser, setTempUser] = useState<User>();
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  // ─── Payment config error dialog ─────────────────────────────────────────
  const [paymentErrorDialog, setPaymentErrorDialog] = useState<{
    open: boolean;
    message: string;       // "Bank Details Missing" | "Stripe not connected"
    pendingData: InvoiceFormSubmitData | null;
  }>({ open: false, message: "", pendingData: null });
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // ─── Payment error dialog: "Save as Draft & Fix" ─────────────────────────
  const handleSaveDraftAndFix = async () => {
    if (!paymentErrorDialog.pendingData) return;
    setIsSavingDraft(true);
    try {
      await saveDraft(paymentErrorDialog.pendingData);
      toast.success("Draft saved successfully");
      setPaymentErrorDialog({ open: false, message: "", pendingData: null });
      router.push("/company");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };


  // ─── Context switch helper for invoice creation under selected company ────
  const switchToCompanyContext = async (companyId: number | null) => {
    if (companyId !== null) {
      await switchAccountContext({ type: "company", company_id: companyId });
    }
  };

  const restoreOriginalContext = async (origType: string, origCompanyId: number | null) => {
    if (origType === "company" && origCompanyId) {
      await switchAccountContext({ type: "company", company_id: origCompanyId });
    } else {
      await switchAccountContext({ type: "personal" });
    }
  };

  // ─── Save as draft helper (reused by dialog) ──────────────────────────────
  const saveDraft = async (data: InvoiceFormSubmitData) => {
    // If a company is selected, switch context before saving
    let origType: string | null = null;
    let origCompanyId: number | null = null;
    if (data.company_id) {
      try {
        const meResp = await getCurrentUser();
        const me = (meResp as any)?.data ?? meResp;
        origType = me?.current_context?.type === "company" ? "company" : "personal";
        origCompanyId = Number(me?.current_context?.company_id ?? me?.active_company_id) || null;
        await switchToCompanyContext(data.company_id);
      } catch { /* proceed anyway */ }
    }
    try {
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
          project_reference: item?.project_reference ?? null,
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
      cis_tax: data.cis_tax ?? null,
      client_utr: data.client_utr ?? null,
      cis_enabled: data.cis_enabled ?? false,
      company_id: data.company_id ?? undefined,
      bank_payment: data.bank_payment ?? false,
      payment_link: data.payment_link ?? false,
    };

    // Remove undefined fields
    Object.keys(draftPayload).forEach(
      key => draftPayload[key as keyof typeof draftPayload] === undefined &&
        delete draftPayload[key as keyof typeof draftPayload]
    );

    await saveOrUpdateDraftInvoice(undefined, draftPayload);
    } finally {
      if (origType !== null) {
        await restoreOriginalContext(origType, origCompanyId).catch(() => {});
      }
    }
  };


  // ─── Payment error dialog: "Cancel" ──────────────────────────────────────
  const handlePaymentErrorCancel = () => {
    setPaymentErrorDialog({ open: false, message: "", pendingData: null });
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
  }, [dispatch]);

  // Refresh tempUser on context switch so stripe status stays context-scoped
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
    dispatch(initializePdfSettings());
  }, [dispatch]);

  const loadInvoiceData = async () => {
    try {
      dispatch(setLoading(true));
      const data = await getInvoiceData();
      setInvoiceData(data);
    } catch (error: unknown) {
      console.error("Failed to load invoice data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load invoice data";
      dispatch(setError(errorMessage));
      toast.error("Failed to load invoice data");
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, []);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);


  // ─── Main submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (data: InvoiceFormSubmitData, isDraft: boolean) => {
    setIsSubmitting(true);
    dispatch(clearError());

    // Capture original context so we can restore after creation
    let origType: string | null = null;
    let origCompanyId: number | null = null;

    try {
      dispatch(setLoading(true));

      if (isDraft) {
        await saveDraft(data);
        toast.success("Draft saved successfully");
        router.push("/invoices");
        return;
      }

      // If a company is selected, switch context before creating the invoice
      if (data.company_id) {
        try {
          const meResp = await getCurrentUser();
          const me = (meResp as any)?.data ?? meResp;
          origType = me?.current_context?.type === "company" ? "company" : "personal";
          origCompanyId = Number(me?.current_context?.company_id ?? me?.active_company_id) || null;
          await switchToCompanyContext(data.company_id);
        } catch { /* proceed anyway */ }
      }

      // If bank_payment is enabled, ensure bank details are persisted to the
      // current context's profile so the backend can find them in the correct table.
      // (Personal → user_banks, Company → invoices_companies)
      if (data.bank_payment && data.account_name) {
        try {
          const meResp = await getCurrentUser();
          const me = (meResp as any)?.data ?? meResp;
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
          console.warn('Failed to pre-save bank details before invoice creation:', e);
          // Proceed anyway — the invoice creation may still succeed
        }
      }

      const items: InvoiceItemRequest[] = data.items.map((item: InvoiceItem) => ({
        name: item.name,
        type: item.type,
        currency: data.currency || DEFAULT_CURRENCY,
        project_reference: item?.project_reference ?? null,
        custom_fields: Array.isArray(item.custom_fields)
          ? item.custom_fields
            .filter((f) => f?.key?.trim() || f?.value?.trim())
            .map((f) => ({ key: f.key?.trim() || "", value: f.value?.trim() || "" }))
          : [],
        price: parseFloat(item.price.toString()),
        quantity: item.type === "product" ? parseFloat(item.quantity?.toString() || "1") : 1,
        discount: item.discount ? parseFloat(item.discount.toString()) : null,
        discount_value: item.discount_value ? parseFloat(item.discount_value.toString()) : null,
        vat: item.vat ? parseFloat(item.vat.toString()) : null,
        vat_value: item.vat_value ? parseFloat(item.vat_value.toString()) : null,
        total_amount: parseFloat(item.total?.toString() || item.total_amount?.toString() || "0")
      }));

      const pdfType = data.pdf_type || selectedPdfTemplate || 'classic';
      const invoiceType = invoiceTypes.find(type => type.id.toString() === data.type_id.toString());
      const isQuotation = invoiceType?.name === "Quotation";

      const payload = {
        invoice_code: data.code || invoiceData?.invoice_code || "INV-0000",
        client_id: parseInt(data.client_id.toString()),
        company_id: data.company_id ?? null,
        type_id: parseInt(data.type_id.toString()),
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        items,
        total_amount: parseFloat(data.total_amount.toString()),
        total_vat: data.total_vat ? parseFloat(data.total_vat.toString()) : null,
        total_discount: data.total_discount ? parseFloat(data.total_discount.toString()) : null,
        final_amount: parseFloat(data.final_amount.toString()),
        status: DEFAULT_STATUS,
        pdf_type: pdfType,
        quotation_title: isQuotation ? data.quotation_title : undefined,
        quotation_content: isQuotation ? data.quotation_content : undefined,
        bank_payment: data.bank_payment,
        payment_link: data.payment_link,
        ...(data.bank_payment ? {
          account_name: data.account_name,
          account_number: data.account_number,
          sort_code: data.sort_code,
        } : {}),
        cis_tax: data.cis_tax ?? null,
        client_utr: data.client_utr ?? null,
        cis_enabled: data.cis_enabled ?? false,
        all_accounts_view: data.all_accounts_view ?? false,
      };

      const newInvoice = await createInvoice(payload);
      setCreatedInvoice(newInvoice);
      toast.success(`${isQuotation ? 'Quotation' : 'Invoice'} ${newInvoice.code} created successfully!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: unknown) {
      console.error("Failed to create invoice:", error);

      let errorMessage = "Failed to create invoice";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes("At least one item must be provided")) {
          errorMessage = "Please add at least one item to the invoice";
        }
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
        return; // don't redirect, let user fix the code
      }

      // ── Payment config errors: show dialog instead of redirecting ──
      if (errorMessage === 'Bank Details Missing' || errorMessage === 'Stripe not connected') {
        setPaymentErrorDialog({
          open: true,
          message: errorMessage,
          pendingData: data,   // store form data so draft can be saved
        });
        return; // don't show generic error toast
      }

      const parsed = parseApiError(error, 'create invoice');
      dispatch(setError(parsed));
      if (isPlanRestrictionError(error)) {
        toast.error(parsed, {
          action: { label: 'Upgrade', onClick: () => router.push('/settings?tab=upgrade-plan') },
        });
      } else {
        toast.error(parsed);
      }



    } finally {
      dispatch(setLoading(false));
      setIsSubmitting(false);
      // Restore original context if we switched for invoice creation
      if (origType !== null) {
        await restoreOriginalContext(origType, origCompanyId).catch(() => {});
      }
    }
  };

  const handleCreateAnother = () => {
    setCreatedInvoice(null);
    setInvoiceData(null);
    dispatch(clearError());
    loadInvoiceData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAll = () => {
    router.push("/invoices");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-12 lg:pt-0">
          <main className="flex-1 p-4 md:p-6">
            <div className="container mx-auto py-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-primary break-words">
                    {createdInvoice
                      ? `${createdInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'} Created Successfully`
                      : "Create New Invoice"}
                  </h1>
                  {createdInvoice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {createdInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'} Code: {createdInvoice.code}
                    </p>
                  )}
                </div>

                {!createdInvoice ? (
                  <Button variant="outline" onClick={handleViewAll} className="w-full sm:w-auto h-9">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/invoices/edit/${createdInvoice.id}`)}
                      className="h-9"
                      disabled={showCompanySelector}
                      title={showCompanySelector ? "Edit is disabled in All-Accounts view" : ""}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit {createdInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}
                    </Button>
                    <Button variant="outline" onClick={handleCreateAnother} className="h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Another
                    </Button>
                    <Button onClick={handleViewAll} className="h-9">
                      View All {createdInvoice.invoice_type === 'Quotation' ? 'Quotations' : 'Invoices'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Success Alert */}
              {createdInvoice && (
                <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <strong>Success!</strong>{" "}
                        {createdInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}{" "}
                        {createdInvoice.code} has been created.
                      </div>
                      <InvoiceActionButtons
                        invoiceId={createdInvoice.id}
                        companyId={createdInvoice.company_id}
                        invoiceCode={createdInvoice.code}
                        onMailClick={() => setMailDialogOpen(true)}
                        disabled={false}
                      />
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className={createdInvoice ? "pointer-events-none opacity-50" : ""}>
                <InvoiceForm
                  onSubmit={handleSubmit}
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

      {/* Mail Dialog */}
      {createdInvoice && (
        <MailDialog
          open={mailDialogOpen}
          onOpenChange={setMailDialogOpen}
          invoice={createdInvoice}
          clients={clients}
          invoiceTypes={invoiceTypes}
        />
      )}

      {/* ── Payment Config Error Dialog ─────────────────────────────────────── */}
      <AlertDialog open={paymentErrorDialog.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Payment Setup Incomplete
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block font-medium text-foreground">
                {paymentErrorDialog.message === 'Bank Details Missing'
                  ? 'Your bank details are missing.'
                  : 'Stripe is not connected to your account.'}
              </span>
              <span className="block text-muted-foreground">
                Would you like to save your work as a draft and go fix your payment settings now?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSavingDraft}
              onClick={handlePaymentErrorCancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingDraft}
              onClick={handleSaveDraftAndFix}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSavingDraft
                ? <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />Saving...</>
                : "Save as Draft & Fix"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
