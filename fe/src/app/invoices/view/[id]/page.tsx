// app/app/invoices/view/[id]/page.tsx - UPDATED WITH QUOTATION FIELDS
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RootState, AppDispatch } from "@/slices/store";
import { getInvoice, getInvoices } from "@/services/invoice.service";
import { setCurrentInvoice, setLoading, setError, clearError } from "@/slices/invoiceSlice";
import { setAuthUser, setFullUser } from "@/slices/authSlice";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { InvoiceActionButtons } from "@/components/invoice/InvoiceActionButtons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { X, Edit, Loader2 } from "lucide-react";
import Sidebar from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';
import { toast } from "sonner";
import { MailDialog } from "@/components/invoice/MailDialog";
import { getCurrentUser, switchAccountContext } from "@/services/service";
import { getViewScope } from "@/utils/view-scope";
import { User } from "@/services/interface/User";

export default function ViewInvoicePage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = parseInt(params.id as string);
  const contextType = searchParams.get("context");
  const contextCompanyId = Number(searchParams.get("company_id"));

  const { currentInvoice, loading, error, invoiceTypes, clients } = useSelector((state: RootState) => state.invoice);
  const [invoiceLoaded, setInvoiceLoaded] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [tempUser, setTempUser] = useState<User>();
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [accessWarning, setAccessWarning] = useState<string | null>(null);
  const canEditCurrentInvoice = useMemo(() => {
    if (!currentInvoice || !tempUser) return false;

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

    return invoiceCompanyId
      ? currentType === "company" && currentCompanyId === invoiceCompanyId
      : currentType === "personal";
  }, [currentInvoice, tempUser]);

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
  const isNotFoundError = (err: any): boolean => {
    const status = Number(err?.response?.status);
    const msg = String(err?.message || '').toLowerCase();
    return status === 404 || msg.includes('resource not found');
  };
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

    // lightweight confirmation for speed
    for (let i = 0; i < 2; i++) {
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      if (sameContext(getContextSnapshot(me), target)) return;
      await wait(80);
    }
  };

  const fetchInvoiceFast = async () => {
    return await getInvoice(id, { skipReferenceData: true });
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
      .map((c: any) => Number(c?.id ?? c?.company_id))
      .filter((cid: number) => Number.isFinite(cid) && cid > 0);

    for (const companyId of companyIds) {
      push({ type: "company", companyId }, candidates);
    }

    return candidates;
  };

  const findInvoiceAcrossContexts = async (
    candidates: ContextSnapshot[]
  ): Promise<{ context: ContextSnapshot; invoiceRow: any } | null> => {
    for (const candidate of candidates) {
      try {
        await switchAndConfirmContext(candidate);
        const rows = await getInvoices();
        const invoiceRow = rows.find((row) => Number(row?.id) === id);
        if (invoiceRow) {
          return { context: candidate, invoiceRow };
        }
      } catch {
        // Continue checking next candidate context
      }
    }
    return null;
  };

  const loadInvoice = useCallback(async () => {
    let originalContext: ContextSnapshot | null = null;
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      setAccessWarning(null);
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      originalContext = getContextSnapshot(me);

      const requestedContext: ContextSnapshot | null =
        contextType === "company" && Number.isFinite(contextCompanyId) && contextCompanyId > 0
          ? { type: "company", companyId: contextCompanyId }
          : contextType === "personal"
            ? { type: "personal", companyId: null }
            : null;

      // Allow viewing from any context - only restrict editing
      // if (requestedContext && !sameContext(originalContext, requestedContext)) {
      //   setAccessWarning("If you want to view or edit this invoice, switch to the related account first.");
      //   setInvoiceLoaded(false);
      //   return;
      // }

      const preferredContext: ContextSnapshot = originalContext;

      try {
        const invoice = await fetchInvoiceFast();
        dispatch(setCurrentInvoice(invoice));
      } catch (detailError) {
        if (!isNotFoundError(detailError)) throw detailError;

        const candidates = buildContextCandidates(me);
        const foundInContext = await findInvoiceAcrossContexts(candidates);
        if (!foundInContext) throw detailError;

        await switchAndConfirmContext(foundInContext.context);
        try {
          const invoice = await fetchInvoiceFast();
          dispatch(setCurrentInvoice(invoice));
        } catch {
          dispatch(setCurrentInvoice(foundInContext.invoiceRow));
        }
      }
      setInvoiceLoaded(true);
    } catch (error: unknown) {
      console.error("Failed to load invoice:", error);

      let errorMessage = "Failed to load invoice";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      dispatch(setError(errorMessage));
      toast.error("Failed to load invoice");
    } finally {
      if (originalContext) {
        try {
          await restoreContext(originalContext);
        } catch (restoreError) {
          console.error('Failed to restore original context:', restoreError);
        }
      }
      dispatch(setLoading(false));
    }
  }, [id, dispatch, contextType, contextCompanyId]);

  useEffect(() => {
    if (id && !isNaN(id)) {
      loadInvoice();
    }
  }, [id, loadInvoice]);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    async function getUser() {
      try {
        const response = await getCurrentUser();
        const me = (response as any)?.data ?? response;
        setTempUser(me as User);
      } catch (e) {
        console.error("Error fetching current user:", e);
      }
    }
    getUser();
  }, []);

  useEffect(() => {
    const handleContextChange = async () => {
      try {
        const response = await getCurrentUser();
        const me = (response as any)?.data ?? response;
        setTempUser(me as User);
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

  const handleCancel = () => {
    router.push("/invoices");
  };

  if (loading && !invoiceLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                  <p className="mt-4 text-lg dark:text-white">Loading invoice...</p>
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
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="max-w-2xl mx-auto mt-10 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6">
                <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  Access from another account is blocked
                </h2>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  {accessWarning}
                </p>
                <Button onClick={handleCancel} className="mt-4">
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
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white">View Invoice</h1>
                <Button variant="outline" onClick={handleCancel} className="h-9">
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
                      <Button onClick={loadInvoice} variant="outline" size="sm">
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

  if (!currentInvoice || currentInvoice.id !== id) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
            <main className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold dark:text-white">View Invoice</h1>
                <Button variant="outline" onClick={handleCancel} className="h-9">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <div className="text-center py-10">
                <p className="text-lg text-gray-600 dark:text-gray-400">Invoice not found</p>
                <Button onClick={handleCancel} className="mt-4">
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
        <div className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <main className="flex-1 p-4 sm:p-6">
            <div className="container mx-auto py-4 sm:py-6">

              {/* Header */}
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Title section */}
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-white">
                    View {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}
                  </h1>

                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'} Code:{" "}
                    <span className="font-medium">{currentInvoice.code}</span>
                  </p>

                  {currentInvoice.quotation_title && (
                    <p className="text-sm text-teal-600 dark:text-teal-400">
                      Title: {currentInvoice.quotation_title}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <InvoiceActionButtons
                    invoiceId={currentInvoice.id}
                    companyId={currentInvoice.company_id}
                    invoiceCode={currentInvoice.code}
                    onMailClick={() => setMailDialogOpen(true)}
                    disabled={false}
                  />

                  {canEditCurrentInvoice ? (
                    <Link href={`/invoices/edit/${id}`} className="w-full sm:w-auto">
                      <Button className="h-10 sm:h-9 w-full sm:w-auto">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit {currentInvoice.invoice_type === 'Quotation' ? 'Quotation' : 'Invoice'}
                      </Button>
                    </Link>
                  ) : (
                    <Button className="h-10 sm:h-9 w-full sm:w-auto" disabled>
                      <Edit className="h-4 w-4 mr-2" />
                      Switch to owner account to edit
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="h-10 sm:h-9 w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Quotation info */}
              {currentInvoice.quotation_title && (
                <div className="mb-6 rounded-lg border p-3 sm:p-4 bg-teal-50 dark:bg-teal-900/20">
                  <h3 className="mb-2 text-base sm:text-lg font-semibold text-teal-700 dark:text-teal-300">
                    {currentInvoice.quotation_title}
                  </h3>

                  {currentInvoice.quotation_content && (
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {currentInvoice.quotation_content}
                    </div>
                  )}
                </div>
              )}

              {/* Status badge */}
              <div className="mb-6">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium max-w-full ${currentInvoice.status === 'Paid'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : currentInvoice.status === 'Created'
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100'
                        : currentInvoice.status === 'Not Paid'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                          : currentInvoice.status === 'Mail Sent'
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                >
                  <span className="truncate">Status: {currentInvoice.status || 'Unknown'}</span>
                </span>
              </div>

              <InvoiceForm
                initialData={currentInvoice}
                onSubmit={() => { }}
                isView={true}
                tempUser={tempUser}
                showCompanySelector={showCompanySelector}
              />
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