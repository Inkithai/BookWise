// Dashboard.tsx - UPDATED VERSION WITHOUT TRIAL BANNER
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { getInvoices } from '@/services/invoice.service';
import { setInvoices } from '@/slices/invoiceSlice';
import { Invoice, InvoiceStatus } from '@/services/interface/invoice';
import { formatCurrency } from '@/services/interface/invoice';
import { getCurrencySymbol } from '@/services/interface/invoice';
import { RefreshCw, FileText, Users, AlertCircle, TrendingUp, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react';
import { getCurrentUser, switchAccountContext } from '@/services/service';
import { User } from '@/services/interface/User';
import { getResolvedActiveCompanyId, getResolvedContextType, isSubUser } from '@/utils/account-context';
import { useRouter } from 'next/navigation';
import { getViewScope, ViewScope } from '@/utils/view-scope';
import { useAppSelector } from '@/slices/hooks';
import {
  canUseAdvancedDashboard,
  canUseCustomDashboard,
  dashboardTier,
} from '@/lib/plan-access';
import DashboardAdvancedInsights from '@/components/dashboard/DashboardAdvancedInsights';
import TrialSubscriptionBanner from '@/components/dashboard/TrialSubscriptionBanner';
import Link from 'next/link';
import { UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';

interface DashboardSummary {
  invoices: {
    total: number;
    totalsByCurrency: Record<string, number>;
    statusCounts: Record<InvoiceStatus, number>;
    topClients: Record<string, { count: number; name: string }>;
  };
  clients: {
    total: number;
    unique: number;
  };
}

const INVOICE_STATUSES: InvoiceStatus[] = [
  'Created',
  'Mail Sent',
  'Rejected',
  'Paid',
  'Installment Payment',
  'Not Paid',
  'Receipt Sent',
  'Draft'
];

type DashboardContextValue = 'all' | 'personal' | `company:${number}`;

type DashboardContextOption = {
  value: DashboardContextValue;
  label: string;
  type: 'all' | 'personal' | 'company';
  companyId?: number;
};

const UnifiedDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.authUser);
  const tier = dashboardTier(authUser);
  const showAdvanced = canUseAdvancedDashboard(authUser);
  const showCustom = canUseCustomDashboard(authUser);
  const userIsSubUser = isSubUser(authUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardInvoices, setDashboardInvoices] = useState<Invoice[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState<string>(localStorage.getItem('company_currency')?.trim() || 'LKR');
  const [selectedContext, setSelectedContext] = useState<DashboardContextValue>('all');
  const [viewScope, setViewScopeState] = useState<ViewScope>('current');
  const [currentContextSnapshot, setCurrentContextSnapshot] = useState<{ type: 'personal' | 'company'; companyId: number | null }>({
    type: 'personal',
    companyId: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Retry utility with exponential backoff
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (err: any) {
        // Auth errors are permanent — retrying won't help; rethrow immediately.
        if (axios.isAxiosError(err) && err.response?.status === 401) throw err;
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw new Error('Operation failed after retries');
  };

  // Separate initialization - runs once on mount
  useEffect(() => {
    initializeUserAndOptions();
  }, []);

  // Re-fetch invoices when user changes or viewScope toggles
  useEffect(() => {
    if (currentUser) {
      fetchInvoicesOnly();
    }
  }, [currentUser, viewScope]);

  // Listen for viewScope changes from sidebar toggle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const apply = () => setViewScopeState(getViewScope());
    apply();
    const handler = () => setViewScopeState(getViewScope());
    window.addEventListener('viewScopeChanged', handler as any);
    return () => window.removeEventListener('viewScopeChanged', handler as any);
  }, []);

  const initializeUserAndOptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUserResponse = await retryOperation(() => getCurrentUser());
      const userData = (currentUserResponse as any)?.data ?? currentUserResponse;
      setCurrentUser(userData);
      setCompanyCurrency(userData?.company?.company_currency || 'LKR');

      const snapshot = getContextFromUser(userData);
      setCurrentContextSnapshot(snapshot);

      // Set selectedContext based on user's actual context (not 'all')
      if (snapshot.type === 'company' && snapshot.companyId) {
        setSelectedContext(`company:${snapshot.companyId}` as DashboardContextValue);
      } else {
        setSelectedContext('personal');
      }

      // Invoices will be fetched by the useEffect on currentUser
    } catch (err) {
      console.error('Failed to initialize:', err);
      // 401 = unauthenticated; the OAuth interceptor will redirect to login.
      // Don't show a blocking error screen — just let the redirect happen.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setError('Failed to load dashboard data after multiple attempts');
    } finally {
      setIsLoading(false);
    }
  };

  const extractLinkedCompanies = (userData: any) => {
    return Array.isArray(userData?.available_companies)
      ? userData.available_companies
        .map((company: any) => ({
          id: Number(company?.id ?? company?.company_id),
          company_name: company?.company_name || company?.name || '',
        }))
        .filter((company: any) => Number.isFinite(company.id) && company.id > 0)
      : [];
  };

  const fetchInvoicesOnly = async (userData?: any) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);

      const user = userData || currentUser;
      const scope = getViewScope();
      let invoices: Invoice[];

      if (scope === 'all' && user) {
        // All-Accounts View: fetch from personal + all linked companies sequentially
        const linkedCompanies = extractLinkedCompanies(user);
        const snapshot = currentContextSnapshot;

        const merged: Invoice[] = [];
        const seen = new Set<string>();
        const addInvoices = (rows: Invoice[]) => {
          rows.forEach((inv) => {
            const key = `${inv.id}-${inv.company_id ?? 'personal'}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(inv);
            }
          });
        };

        try {
          // Fetch personal invoices
          try {
            await switchAndConfirmContext({ type: 'personal', companyId: null });
            addInvoices(await getInvoices());
          } catch (e) {
            console.warn('Context switch to personal failed; skipping personal invoices.', e);
          }

          // Fetch each company's invoices
          for (const company of linkedCompanies) {
            try {
              await switchAndConfirmContext({ type: 'company', companyId: company.id });
              addInvoices(await getInvoices());
            } catch (e) {
              console.warn(`Context switch failed for company ${company.id}; continuing with fallback resolution.`, e);
            }
          }
        } finally {
          await restoreOriginalContext(snapshot);
        }
        invoices = merged;
      } else {
        // Current context only
        invoices = await retryOperation(
          () => getInvoices(),
          3,
          1000
        );

        // Filter invoices to current context
        const snapshot = currentContextSnapshot;
        const personalHostId = user?.personal_company_id ?? user?.host_id ?? user?.id;
        const resolvedPersonalHostId =
          Number.isFinite(Number(personalHostId)) && Number(personalHostId) > 0 ? Number(personalHostId) : null;

        invoices = invoices.filter((invoice) => {
          const invoiceCompanyRaw = Number(invoice.company_id);
          const invoiceCompanyId =
            Number.isFinite(invoiceCompanyRaw) && invoiceCompanyRaw > 0 ? invoiceCompanyRaw : null;

          if (snapshot.type === 'company' && snapshot.companyId) {
            return !!invoiceCompanyId && invoiceCompanyId === snapshot.companyId;
          }

          // Personal context: match by host_id (new field) or legacy company_id.
          const invoiceHostId = Number.isFinite(Number((invoice as any).host_id)) && Number((invoice as any).host_id) > 0
            ? Number((invoice as any).host_id) : null;
          if (!invoiceCompanyId && !invoiceHostId) return true;
          if (resolvedPersonalHostId) {
            return invoiceHostId === resolvedPersonalHostId || invoiceCompanyId === resolvedPersonalHostId;
          }
          return true;
        });
      }

      setDashboardInvoices(invoices);
      dispatch(setInvoices(invoices));
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch invoices:', err);
        // For sub-users, the invoices endpoint may return 403 due to permission scoping.
        // Show an empty dashboard instead of a blocking error.
        const isPermissionError =
          (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 401));
        if (isPermissionError) {
          setDashboardInvoices([]);
          dispatch(setInvoices([]));
          setLastUpdated(new Date());
        } else {
          setError('Failed to load invoice data after multiple attempts');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getContextFromUser = (userData: any): { type: 'personal' | 'company'; companyId: number | null } => {
    return {
      type: getResolvedContextType(userData),
      companyId: getResolvedActiveCompanyId(userData),
    };
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const switchAndConfirmContext = async (target: { type: 'personal' | 'company'; companyId: number | null }) => {
    let result;
    if (target.type === 'company' && target.companyId) {
      result = await switchAccountContext({ type: 'company', company_id: target.companyId });
    } else {
      result = await switchAccountContext({ type: 'personal' });
    }

    // Optimization: Trust the API response which already contains the fresh context state
    if (result?.success) {
      return result.data;
    }

    // Fallback: only one check if the result wasn't explicitly successful
    const me = await getCurrentUser();
    return (me as any)?.data ?? me;
  };

  const restoreOriginalContext = async (snapshot: { type: 'personal' | 'company'; companyId: number | null }) => {
    await switchAndConfirmContext(snapshot);
  };

  const fetchInvoicesForSelectedContext = async (
    selected: DashboardContextValue,
    availableCompanies: Array<{ id: number }>,
    snapshot: { type: 'personal' | 'company'; companyId: number | null }
  ): Promise<Invoice[]> => {
    if (selected === 'all') {
      // Parallel context switching for better performance
      const merged: Invoice[] = [];
      const seen = new Set<string>();
      const addInvoices = (invoices: Invoice[]) => {
        invoices.forEach((invoice) => {
          const key = `${invoice.id}-${invoice.company_id ?? 'personal'}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(invoice);
          }
        });
      };

      try {
        // Execute all context switches in parallel
        const contextPromises = [
          (async () => {
            await switchAndConfirmContext({ type: 'personal', companyId: null });
            return await getInvoices();
          })(),
          ...availableCompanies.map(company => (async () => {
            await switchAndConfirmContext({ type: 'company', companyId: company.id });
            return await getInvoices();
          })())
        ];

        const results = await Promise.all(contextPromises);
        results.forEach(addInvoices);
      } finally {
        await restoreOriginalContext(snapshot);
      }
      return merged;
    }

    if (selected === 'personal') {
      try {
        await switchAndConfirmContext({ type: 'personal', companyId: null });
        return await getInvoices();
      } finally {
        await restoreOriginalContext(snapshot);
      }
    }

    const companyId = Number(selected.replace('company:', ''));
    if (Number.isFinite(companyId) && companyId > 0) {
      try {
        await switchAndConfirmContext({ type: 'company', companyId });
        return await getInvoices();
      } finally {
        await restoreOriginalContext(snapshot);
      }
    }

    return [];
  };

  // Memoized context options
  const contextOptions = useMemo(() => {
    if (!currentUser) return [{ value: 'all', label: 'All', type: 'all' }];

    const userData = currentUser as any;
    const linkedCompanies = extractLinkedCompanies(userData);
    const personalName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Personal';

    return [
      { value: 'all', label: 'All', type: 'all' },
      { value: 'personal', label: personalName, type: 'personal' },
      ...linkedCompanies.map((company: any) => ({
        value: `company:${company.id}` as DashboardContextValue,
        label: company.company_name || `Company ${company.id}`,
        type: 'company' as const,
        companyId: company.id,
      })),
    ];
  }, [currentUser]);

  // Pure computed summary - no derived state
  const summary = useMemo((): DashboardSummary => {
    const statusCounts: Record<InvoiceStatus, number> = {
      'Created': 0,
      'Mail Sent': 0,
      'Rejected': 0,
      'Paid': 0,
      'Installment Payment': 0,
      'Not Paid': 0,
      'Receipt Sent': 0,
      'Draft': 0
    };

    const clientsMap: Record<string, { count: number; name: string }> = {};
    const totalsByCurrency: Record<string, number> = {};

    dashboardInvoices.forEach((invoice: Invoice) => {
      const status = invoice.status as InvoiceStatus;
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const clientId = invoice.client_id?.toString() || invoice.client || 'Unknown';
      const clientName = invoice.client_object?.name || invoice.client || `Client ${clientId}`;

      if (!clientsMap[clientId]) {
        clientsMap[clientId] = { count: 0, name: clientName };
      }
      clientsMap[clientId].count++;

      (invoice.items || []).forEach((item) => {
        const currency = (item.currency || companyCurrency || 'LKR').toUpperCase();
        const itemTotal = Number(item.total || item.total_amount || 0);
        totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + itemTotal;
      });
    });

    return {
      invoices: {
        total: dashboardInvoices.length,
        totalsByCurrency,
        statusCounts,
        topClients: clientsMap,
      },
      clients: {
        total: Object.keys(clientsMap).length,
        unique: Object.keys(clientsMap).length
      }
    };
  }, [dashboardInvoices, companyCurrency]);

  const displaySummary = useMemo(() => summary || {
    invoices: {
      total: 0,
      totalsByCurrency: {},
      statusCounts: {
        'Created': 0,
        'Mail Sent': 0,
        'Rejected': 0,
        'Paid': 0,
        'Installment Payment': 0,
        'Not Paid': 0,
        'Receipt Sent': 0,
        'Draft': 0
      },
      topClients: {}
    },
    clients: {
      total: 0,
      unique: 0
    }
  }, [summary]);

  const getStatusIcon = (status: InvoiceStatus): React.ReactNode => {
    const iconClass = "w-5 h-5";
    switch (status) {
      case 'Paid':
        return <CheckCircle2 className={`${iconClass} text-green-500`} />;
      case 'Not Paid':
      case 'Rejected':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'Mail Sent':
      case 'Installment Payment':
        return <Clock className={`${iconClass} text-primary`} />;
      default:
        return <FileText className={`${iconClass} text-primary`} />;
    }
  };

  const getStatusBadgeClass = (status: InvoiceStatus): string => {
    const baseClass = "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold";
    switch (status) {
      case 'Paid':
        return `${baseClass} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`;
      case 'Not Paid':
      case 'Rejected':
        return `${baseClass} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`;
    }
  };

  const getDashboardCurrencyLabel = (currency: string): string => {
    const upper = currency.toUpperCase();
    if (upper === 'CAD') return 'CA$';
    if (upper === 'USD') return 'US$';
    return getCurrencySymbol(upper);
  };

  // Skeleton loading component
  const MetricCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 animate-pulse">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="p-2.5 sm:p-3 rounded-xl bg-gray-200 dark:bg-gray-700 w-10 h-10 sm:w-12 sm:h-12" />
        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
      <div className="h-7 sm:h-9 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>
  );

  const StatusCardSkeleton = () => (
    <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center animate-pulse">
      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2 sm:mb-3" />
      <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto mb-1 sm:mb-2" />
      <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-10 mx-auto" />
    </div>
  );

  const ClientCardSkeleton = () => (
    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div>
          <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 sm:w-40 mb-2" />
          <div className="h-2 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
      <div className="h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
    </div>
  );

  if (isLoading && !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="max-w-[1600px] xl:max-w-[1800px] mx-auto">
          {/* Header Skeleton */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 lg:mb-10">
            <div className="animate-pulse">
              <div className="h-8 sm:h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 sm:w-40 mb-2" />
              <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 sm:w-64" />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <div className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Metrics Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>

          {/* Status Breakdown Skeleton */}
          <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-800 mb-6 sm:mb-8">
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 sm:mb-6 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <StatusCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Top Clients Skeleton */}
          <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-800">
            <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4 sm:mb-6 animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900 px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-700 dark:text-gray-300" />
            </div>
          </div>
        )}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600 dark:text-red-400" />
            <p className="text-lg font-bold text-black dark:text-white mb-2">Error loading dashboard</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={initializeUserAndOptions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:shadow-lg transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-6 lg:p-8 xl:p-10">
      <div className="max-w-[1600px] xl:max-w-[1800px] mx-auto">
        {/* Loading overlay for context switches - NOW blocks interactions */}
        {isLoading && summary && (
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
            role="dialog"
            aria-label="Loading dashboard data"
            aria-modal="true"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-700 dark:text-gray-300" />
            </div>
          </div>
        )}

        <TrialSubscriptionBanner />

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8 lg:mb-10">
          <div className="w-full lg:w-auto">
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold dark:text-white mb-1 sm:mb-2 text-primary">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Complete overview of invoices and clients
              {tier !== 'standard' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 capitalize">
                  {tier} dashboard
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <button
              onClick={fetchInvoicesOnly}
              className="flex-shrink-0 min-h-[44px] min-w-[44px] h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center"
              disabled={isLoading}
              aria-label="Refresh dashboard data"
              aria-busy={isLoading}
              type="button"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Top Metrics - Invoice & Client Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Invoices */}
          <div className="group relative bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-transparent dark:from-gray-700/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-teal-100 dark:bg-gray-700">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary dark:text-gray-300" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-gray-600" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium mb-1">Total Invoices</p>
              <p className="text-2xl sm:text-3xl text-gray-900 dark:text-white font-bold break-words">{displaySummary.invoices.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">All invoices created</p>
              {lastUpdated && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Total Clients */}
          <div className="group relative bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary dark:text-teal-400" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-teal-600" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium mb-1">Active Clients</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">{displaySummary.clients.unique}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">From {displaySummary.clients.total || 0} total</p>
            </div>
          </div>

          {/* Total Amount */}
          <div className="group relative bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-transparent dark:from-green-900/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-teal-100 dark:bg-green-900/30">
                  <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-primary dark:text-green-400" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-green-600" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium mb-1">Total Invoice Value</p>
              {Object.keys(displaySummary.invoices.totalsByCurrency).length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(displaySummary.invoices.totalsByCurrency)
                    .sort(([, amountA], [, amountB]) => Number(amountB) - Number(amountA))
                    .slice(0, 4)
                    .map(([currency, amount]) => (
                      <div
                        key={currency}
                        className="flex-1 min-w-[100px] sm:min-w-[120px] rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/70"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {getDashboardCurrencyLabel(currency)}
                          </span>
                          <span className="text-sm font-semibold dark:text-white text-primary truncate whitespace-nowrap">
                            {Number(amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">{formatCurrency(0, companyCurrency)}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Split by invoice currency</p>
            </div>
          </div>
        </div>

        {showAdvanced ? (
          <DashboardAdvancedInsights
            invoices={dashboardInvoices}
            currency={companyCurrency}
            showEnterpriseBanner={showCustom}
          />
        ) : !userIsSubUser ? (
          <div className="mb-6 sm:mb-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Standard dashboard</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Upgrade to Business Premium for revenue trends, collection rate, and overdue tracking.
              </p>
            </div>
            <Link
              href={UPGRADE_PLAN_PATH}
              className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              View plans →
            </Link>
          </div>
        ) : null}

        {/* Invoice Status Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-800 mb-6 sm:mb-8 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Invoice Status Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {INVOICE_STATUSES.map((status: InvoiceStatus) => {
              const count = displaySummary.invoices.statusCounts[status] || 0;
              return (
                <button
                  key={status}
                  onClick={() => router.push(`/invoices?status=${encodeURIComponent(status)}`)}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center hover:shadow-md hover:border-primary/40 active:scale-[0.97] transition-all duration-300 cursor-pointer"
                >
                  <div className="flex justify-center mb-2 sm:mb-3">
                    {getStatusIcon(status)}
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 sm:mb-2 break-words leading-tight">{status}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                    {displaySummary.invoices.total > 0 ? ((count / displaySummary.invoices.total) * 100).toFixed(0) : 0}%
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Top Clients</h2>
          {displaySummary.invoices.total === 0 && !isLoading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No invoices yet
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto px-4">
                Create your first invoice to see your business data and analytics here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(displaySummary.invoices.topClients).length > 0 ? (
                Object.entries(displaySummary.invoices.topClients)
                  .sort(([, dataA], [, dataB]) => (dataB.count || 0) - (dataA.count || 0))
                  .slice(0, 5)
                  .map(([clientId, data], index) => (
                    <div
                      key={clientId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300 gap-3 sm:gap-0 active:scale-[0.99] cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Client ${data.name} with ${data.count} invoices`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white break-words leading-tight line-clamp-2">{data.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Client ID: {clientId}</p>
                        </div>
                      </div>
                      <div className={`${getStatusBadgeClass('Paid')} text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>
                        {data.count} {data.count === 1 ? 'invoice' : 'invoices'}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="p-6 sm:p-8 text-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No clients data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;