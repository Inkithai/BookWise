// src/components/subscription/SubscriptionDashboard.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PLAN_META, PLAN_TYPES, PlanType, SelectedFeature, type BillingInterval } from '../../lib/Subscriptiontypes';
import type { Feature as SubscriptionFeature } from '../../lib/Subscriptiontypes';
import FeatureCard from './Featurecard';
import FeatureFilterTabs, { FilterType } from './Featurefiltertabs';
import CheckoutPanel from './Checkoutpanel';
import StripeCheckoutModal from './Stripecheckoutmodal';
import CancelSubscriptionModal from './CancelSubscriptionModal';
import {
  getPlans, createSubscriptionPaymentIntent, getPaymentHistory, getInvoices,
  getFeatures, getTeamFeatures, cancelTeamFeature, reactivateTeamFeature,
  createRefundRequest, getRefundRequests,
  PlanItem, ApiFeature, TeamFeatureItem, PaymentHistoryItem, InvoiceItem
} from '@/services/sync-subscription.service';
import toast from 'react-hot-toast';
import { Loader2, CreditCard, FileText } from 'lucide-react';

/** Map API feature name/slug to subscription UI icon and color. */
const FEATURE_UI_MAP: Record<string, { iconName: string; color: string }> = {
  crm: { iconName: 'Users', color: '#0D9488' },
  whatsapp: { iconName: 'MessageSquare', color: '#25D366' },
  invoice: { iconName: 'FileText', color: '#F59E0B' },
  invoicing: { iconName: 'FileText', color: '#F59E0B' },
  payments: { iconName: 'CreditCard', color: '#0F766E' },
  payment: { iconName: 'CreditCard', color: '#0F766E' },
};
const DEFAULT_UI = { iconName: 'BarChart2', color: '#0D9488' };

function apiFeatureToSubscriptionFeature(
  api: ApiFeature,
  planPricesMonthly: Record<string, number>,
  planPricesYearly: Record<string, number>,
  planDiscountPercent: Record<string, number>,
): SubscriptionFeature {
  const slug = (api.name || '').toLowerCase().replace(/\s+/g, '_');
  const key = Object.keys(FEATURE_UI_MAP).find((k) => slug.includes(k) || api.name?.toLowerCase().includes(k)) ?? '';
  const ui = key ? FEATURE_UI_MAP[key] : DEFAULT_UI;
  const subType = (api.subscription_type || 'paid').toLowerCase();
  const hasFree = subType === 'free' || subType === 'trial';
  return {
    id: api.id,
    name: api.display_name || api.name || 'Feature',
    iconName: ui.iconName,
    description: api.description || '',
    plans: { free: hasFree, pro: true, premium: true },
    pricing: {
      free: planPricesMonthly.free ?? 0,
      pro: planPricesMonthly.pro ?? 0,
      premium: planPricesMonthly.premium ?? 0,
    },
    pricingYearly: {
      free: planPricesYearly.free ?? 0,
      pro: planPricesYearly.pro ?? 0,
      premium: planPricesYearly.premium ?? 0,
    },
    yearlyDiscountPercent: {
      free: planDiscountPercent.free ?? 0,
      pro: planDiscountPercent.pro ?? 0,
      premium: planDiscountPercent.premium ?? 0,
    },
    badge: api.is_popular ? 'Most Popular' : null,
    color: ui.color,
  };
}

type CurrentPlanInfo = { plan: PlanType; teamFeatureId: number; status: string };

const slugToPlanType = (slug: string): PlanType => {
  const s = (slug || '').toLowerCase();
  if (s === 'professional') return 'pro';
  if (s === 'enterprise') return 'premium';
  if (s === 'pro') return 'pro';
  if (s === 'premium') return 'premium';
  return 'free';
};

type MainTab = 'plans' | 'payment-history';

const SubscriptionDashboard: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('plans');
  const [selections, setSelections] = useState<Record<number, PlanType>>({});
  const [billingIntervalByFeatureId, setBillingIntervalByFeatureId] = useState<Record<number, BillingInterval>>({});
  const [filter, setFilter] = useState<FilterType>('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [apiFeatures, setApiFeatures] = useState<ApiFeature[]>([]);
  const [teamFeatures, setTeamFeatures] = useState<TeamFeatureItem[]>([]);
  const [loadingTeamFeatures, setLoadingTeamFeatures] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [cancelModal, setCancelModal] = useState<{ teamFeatureId: number; featureName: string } | null>(null);
  const [refundedTeamFeatureIds, setRefundedTeamFeatureIds] = useState<Set<number>>(new Set());
  const shouldSyncSelectionsFromServer = React.useRef(true);

  // Payment history tab
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [metaPayments, setMetaPayments] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [metaInvoices, setMetaInvoices] = useState({ total: 0, current_page: 1, last_page: 1 });

  const fetchTeamFeatures = useCallback(() => {
    setLoadingTeamFeatures(true);
    return getTeamFeatures()
      .then(setTeamFeatures)
      .catch(() => setTeamFeatures([]))
      .finally(() => setLoadingTeamFeatures(false));
  }, []);

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    setLoadingFeatures(true);
    getFeatures()
      .then((list) => {
        const features = Array.isArray(list) ? list.filter((f: any) => f.status !== 'inactive') : [];
        // Filter ONLY for invoice related features
        const invoiceFeatures = features.filter((f: any) =>
          (f.name || '').toLowerCase().includes('invoice') ||
          (f.display_name || '').toLowerCase().includes('invoice')
        );
        setApiFeatures(invoiceFeatures);
      })
      .catch(() => setApiFeatures([]))
      .finally(() => setLoadingFeatures(false));
  }, []);

  useEffect(() => {
    fetchTeamFeatures();
  }, [fetchTeamFeatures]);

  useEffect(() => {
    getRefundRequests({ status: 'refunded', per_page: 200 })
      .then((res: any) => {
        const ids = new Set<number>((res.data || []).map((r: any) => Number(r.team_feature_id)).filter((id: any) => Number.isFinite(id)));
        setRefundedTeamFeatureIds(ids);
      })
      .catch(() => setRefundedTeamFeatureIds(new Set()));
  }, []);

  const fetchPaymentHistory = useCallback(async () => {
    setLoadingPaymentHistory(true);
    try {
      const [payRes, invRes] = await Promise.all([
        getPaymentHistory({ per_page: 20 }),
        getInvoices({ per_page: 20 }),
      ]);
      setPayments(payRes.data);
      setMetaPayments(payRes.meta as { total: number; current_page: number; last_page: number });
      setInvoices(invRes.data);
      setMetaInvoices(invRes.meta as { total: number; current_page: number; last_page: number });
    } catch {
      setPayments([]);
      setInvoices([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'payment-history') fetchPaymentHistory();
  }, [mainTab, fetchPaymentHistory]);

  /** When team features finish loading, pre-select the active plan for each feature. Re-runs after payment success. */
  useEffect(() => {
    if (loadingTeamFeatures) return;
    if (!shouldSyncSelectionsFromServer.current) return;
    shouldSyncSelectionsFromServer.current = false;
    setSelections((prev) => {
      const next = { ...prev };
      teamFeatures.forEach((tf) => {
        const planSlug = tf.plan?.slug ?? 'free';
        next[tf.feature_id] = slugToPlanType(planSlug);
      });
      return next;
    });
  }, [loadingTeamFeatures, teamFeatures]);

  const planPricesBySlug = useMemo(() => {
    const map: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    plans.forEach((p) => {
      const slug = slugToPlanType(p.slug);
      if (slug in map && p.amount_monthly != null) map[slug] = Number(p.amount_monthly);
    });
    return map;
  }, [plans]);

  const planPricesYearlyBySlug = useMemo(() => {
    const map: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    plans.forEach((p) => {
      const slug = slugToPlanType(p.slug);
      if (slug in map && p.amount_yearly != null) map[slug] = Number(p.amount_yearly);
    });
    return map;
  }, [plans]);

  const planDiscountPercentBySlug = useMemo(() => {
    const map: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    plans.forEach((p) => {
      const slug = slugToPlanType(p.slug);
      if (slug in map && p.yearly_discount_percent != null) map[slug] = Number(p.yearly_discount_percent);
    });
    return map;
  }, [plans]);

  const featuresWithPricing = useMemo(() => {
    return apiFeatures.map((api) =>
      apiFeatureToSubscriptionFeature(api, planPricesBySlug, planPricesYearlyBySlug, planDiscountPercentBySlug),
    );
  }, [apiFeatures, planPricesBySlug, planPricesYearlyBySlug, planDiscountPercentBySlug]);

  /** Current plan per feature_id (only for features the user has in team_features). */
  const currentPlansByFeatureId = useMemo((): Record<number, CurrentPlanInfo> => {
    const map: Record<number, CurrentPlanInfo> = {};
    teamFeatures.forEach((tf) => {
      const planSlug = tf.plan?.slug ?? 'free';
      map[tf.feature_id] = {
        plan: slugToPlanType(planSlug),
        teamFeatureId: tf.id,
        status: tf.status ?? 'active',
      };
    });
    return map;
  }, [teamFeatures]);

  const handlePlanChange = (featureId: number, plan: PlanType | null) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (plan === null) delete next[featureId];
      else next[featureId] = plan;
      return next;
    });
  };

  const filteredFeatures = featuresWithPricing.filter((f) => {
    const current = currentPlansByFeatureId[f.id];
    if (filter === 'active') return !!current && current.status === 'active';
    if (filter === 'free') return f.plans.free;
    return true;
  });

  /** When filter is "all", split into enrolled vs not enrolled for separate sections. */
  const { enrolledFeatures, unenrolledFeatures } = useMemo(() => {
    if (filter !== 'all') {
      return { enrolledFeatures: filteredFeatures, unenrolledFeatures: [] };
    }
    const enrolled: SubscriptionFeature[] = [];
    const unenrolled: SubscriptionFeature[] = [];
    filteredFeatures.forEach((f) => {
      if (currentPlansByFeatureId[f.id]) enrolled.push(f);
      else unenrolled.push(f);
    });
    return { enrolledFeatures: enrolled, unenrolledFeatures: unenrolled };
  }, [filter, filteredFeatures, currentPlansByFeatureId]);

  const getBillingInterval = useCallback((featureId: number): BillingInterval => {
    return billingIntervalByFeatureId[featureId] ?? 'monthly';
  }, [billingIntervalByFeatureId]);

  /** Only include in cart when user is upgrading/changing: selected plan differs from current plan (or feature not enrolled). */
  const checkoutItems: SelectedFeature[] = featuresWithPricing
    .filter((f) => {
      const selected = selections[f.id];
      if (!selected) return false;
      const current = currentPlansByFeatureId[f.id]?.plan;
      return current === undefined || selected !== current;
    })
    .map((f) => {
      const plan = selections[f.id];
      const interval = getBillingInterval(f.id);
      const price =
        interval === 'yearly' && f.pricingYearly
          ? f.pricingYearly[plan]
          : f.pricing[plan];
      return {
        ...f,
        plan,
        price,
        billingInterval: interval,
      };
    });

  const total = checkoutItems.reduce((s, i) => s + i.price, 0);

  const handleSuccess = () => {
    setShowCheckout(false);
    setSelections({});
    setBillingIntervalByFeatureId({});
    shouldSyncSelectionsFromServer.current = true;
    fetchTeamFeatures().then(() => {
      toast.success('Subscription updated. Your plan has been upgraded.');
    });
  };

  const handleCancelClick = (teamFeatureId: number, featureName: string) => {
    setCancelModal({ teamFeatureId, featureName });
  };

  const handleCancelOnly = async (teamFeatureId: number) => {
    await cancelTeamFeature(teamFeatureId);
    setCancelModal(null);
    fetchTeamFeatures();
    toast.success('Subscription cancelled. You can reactivate anytime.', {
      duration: 5000,
      style: {
        background: '#065f46',
        color: '#ecfdf5',
        borderRadius: '12px',
        padding: '16px 20px',
      },
      iconTheme: { primary: '#34d399', secondary: '#065f46' },
    });
  };

  const handleRequestRefund = async (teamFeatureId: number, reason?: string) => {
    await createRefundRequest({ team_feature_id: teamFeatureId, reason, cancel_subscription: true });
    setCancelModal(null);
    fetchTeamFeatures();
    getRefundRequests({ status: 'refunded', per_page: 200 })
      .then((res: any) => {
        const ids = new Set<number>((res.data || []).map((r: any) => Number(r.team_feature_id)).filter((id: any) => Number.isFinite(id)));
        setRefundedTeamFeatureIds(ids);
      })
      .catch(() => undefined);
    toast.success('Refund request submitted. Super admin will review and process manually.');
  };

  const handleReactivate = (teamFeatureId: number) => {
    reactivateTeamFeature(teamFeatureId)
      .then(() => {
        fetchTeamFeatures();
        toast.success('Subscription reactivated.');
      })
      .catch((e) => toast.error(e?.message || 'Failed to reactivate.'));
  };

  /** When total is £0, apply subscription via API (no Stripe). Otherwise open payment modal. */
  const handleCheckoutClick = async () => {
    if (checkoutItems.length === 0) return;
    if (total > 0) {
      setShowCheckout(true);
      return;
    }
    try {
      const payload = checkoutItems.map((i) => ({
        feature_id: i.id,
        plan_slug: i.plan,
        billing_interval: (i.billingInterval ?? 'monthly') as 'monthly' | 'yearly',
      }));
      const data = await createSubscriptionPaymentIntent(payload);
      if (data?.all_free) {
        setShowCheckout(false);
        setSelections({});
        setBillingIntervalByFeatureId({});
        shouldSyncSelectionsFromServer.current = true;
        fetchTeamFeatures().then(() => {
          toast.success('Subscription updated. Your plan has been upgraded.');
        });
      } else {
        setShowCheckout(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to activate subscription.');
    }
  };

  return (
    <>
      <div className="max-w-100% space-y-8 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* <h1 className="text-2xl font-bold text-gray-900">Subscription Settings</h1> */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setMainTab('plans')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mainTab === 'plans' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Plans
            </button>
            <button
              type="button"
              onClick={() => setMainTab('payment-history')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mainTab === 'payment-history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Payment history
            </button>
          </div>
        </div>

        {mainTab === 'payment-history' ? (
          <div className="space-y-8">
            {loadingPaymentHistory ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <section className="rounded-lg shadow bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#0D9488]" />
                    <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    {payments.length === 0 ? (
                      <p className="p-8 text-center text-gray-500 text-sm">No payments yet.</p>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Features & plans</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id} className="border-t border-gray-100">
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                £{p.amount}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {p.items && p.items.length > 0
                                  ? p.items.map((it: any, i: number) => (
                                    <span key={i}>
                                      {i > 0 && ', '}
                                      {it.feature_name} ({it.plan_name || it.plan_slug})
                                    </span>
                                  ))
                                  : `${p.items_count} feature(s)`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {metaPayments.total > 0 && (
                    <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                      Total: {metaPayments.total} payment(s)
                    </p>
                  )}
                </section>
                <section className="rounded-lg shadow bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#0D9488]" />
                    <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                  </div>
                  <div className="overflow-x-auto">
                    {invoices.length === 0 ? (
                      <p className="p-8 text-center text-gray-500 text-sm">No invoices yet.</p>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="border-t border-gray-100">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">£{inv.amount}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {metaInvoices.total > 0 && (
                    <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                      Total: {metaInvoices.total} invoice(s)
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          /* Feature selection section */
          <section className="space-y-5 p-6 rounded-lg shadow bg-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your feature plans</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Subscribe per feature: choose monthly or yearly for each. Select one or more features and pay once. You can cancel anytime.
                </p>
              </div>
              {/* Plan legend – each feature has its own Monthly/Yearly on the card */}
              <div className="flex items-center gap-4 flex-wrap">
                {PLAN_TYPES.map((plan) => {
                  const priceMo = planPricesBySlug[plan] ?? 0;
                  const priceYr = planPricesYearlyBySlug[plan] ?? 0;
                  const saveAmount = priceMo > 0 && priceYr > 0 ? Math.round((12 * priceMo - priceYr) * 100) / 100 : 0;
                  return (
                    <div key={plan} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: PLAN_META[plan].color }}
                      />
                      <span className="text-[13px] font-semibold text-gray-600">{PLAN_META[plan].label}</span>
                      <span className="text-[12px] text-gray-400">
                        {priceMo === 0 ? '£0' : `£${priceMo}/mo · £${priceYr}/yr${saveAmount > 0 ? ` (Save £${saveAmount})` : ''}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter tabs */}
            <FeatureFilterTabs activeFilter={filter} onChange={setFilter} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              {/* Feature cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(loadingFeatures || loadingTeamFeatures) && (
                  <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                    {loadingFeatures ? 'Loading features…' : 'Loading your subscriptions…'}
                  </div>
                )}

                {!loadingFeatures && !loadingTeamFeatures && filter === 'all' && (
                  <>
                    {/* Enrolled features section */}
                    {enrolledFeatures.length > 0 && (
                      <div className="col-span-full space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Enrolled features ({enrolledFeatures.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AnimatePresence mode="popLayout">
                            {enrolledFeatures.map((feature, i) => (
                              <motion.div
                                key={feature.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.04 }}
                              >
                                <FeatureCard
                                  feature={feature}
                                  billingInterval={getBillingInterval(feature.id)}
                                  onBillingIntervalChange={(id, interval) => setBillingIntervalByFeatureId((prev) => ({ ...prev, [id]: interval }))}
                                  selectedPlan={selections[feature.id] ?? null}
                                  currentPlan={currentPlansByFeatureId[feature.id]?.plan ?? null}
                                  teamFeatureId={currentPlansByFeatureId[feature.id]?.teamFeatureId}
                                  subscriptionStatus={currentPlansByFeatureId[feature.id]?.status}
                                  canReactivate={!refundedTeamFeatureIds.has(Number(currentPlansByFeatureId[feature.id]?.teamFeatureId))}
                                  onPlanChange={handlePlanChange}
                                  onCancel={handleCancelClick}
                                  onReactivate={handleReactivate}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Not enrolled / available to enroll */}
                    {unenrolledFeatures.length > 0 && (
                      <div className="col-span-full space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Available to enroll ({unenrolledFeatures.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <AnimatePresence mode="popLayout">
                            {unenrolledFeatures.map((feature, i) => (
                              <motion.div
                                key={feature.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.04 }}
                              >
                                <FeatureCard
                                  feature={feature}
                                  billingInterval={getBillingInterval(feature.id)}
                                  onBillingIntervalChange={(id, interval) => setBillingIntervalByFeatureId((prev) => ({ ...prev, [id]: interval }))}
                                  selectedPlan={selections[feature.id] ?? null}
                                  currentPlan={null}
                                  teamFeatureId={undefined}
                                  subscriptionStatus={undefined}
                                  canReactivate={false}
                                  onPlanChange={handlePlanChange}
                                  onCancel={handleCancelClick}
                                  onReactivate={handleReactivate}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {enrolledFeatures.length === 0 && unenrolledFeatures.length === 0 && (
                      <div className="col-span-full text-center py-14 text-gray-400 text-[14px]">
                        {apiFeatures.length === 0 ? 'No features available.' : 'No features match this filter.'}
                      </div>
                    )}
                  </>
                )}

                {/* Other filters: single list */}
                {!loadingFeatures && !loadingTeamFeatures && filter !== 'all' && (
                  <>
                    <AnimatePresence mode="popLayout">
                      {filteredFeatures.map((feature, i) => (
                        <motion.div
                          key={feature.id}
                          layout
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <FeatureCard
                            feature={feature}
                            billingInterval={getBillingInterval(feature.id)}
                            onBillingIntervalChange={(id, interval) => setBillingIntervalByFeatureId((prev) => ({ ...prev, [id]: interval }))}
                            selectedPlan={selections[feature.id] ?? null}
                            currentPlan={currentPlansByFeatureId[feature.id]?.plan ?? null}
                            teamFeatureId={currentPlansByFeatureId[feature.id]?.teamFeatureId}
                            subscriptionStatus={currentPlansByFeatureId[feature.id]?.status}
                            canReactivate={!refundedTeamFeatureIds.has(Number(currentPlansByFeatureId[feature.id]?.teamFeatureId))}
                            onPlanChange={handlePlanChange}
                            onCancel={handleCancelClick}
                            onReactivate={handleReactivate}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredFeatures.length === 0 && (
                      <div className="col-span-full text-center py-14 text-gray-400 text-[14px]">
                        No features match this filter.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Sticky checkout */}
              <div className="lg:sticky lg:top-6">
                <CheckoutPanel
                  items={checkoutItems}
                  onCheckout={handleCheckoutClick}
                  onClear={() => setSelections({})}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Stripe modal */}
      <AnimatePresence>
        {showCheckout && (
          <StripeCheckoutModal
            items={checkoutItems}
            total={total}
            onClose={() => setShowCheckout(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      {cancelModal && (
        <CancelSubscriptionModal
          featureName={cancelModal.featureName}
          teamFeatureId={cancelModal.teamFeatureId}
          onClose={() => setCancelModal(null)}
          onCancelOnly={handleCancelOnly}
          onRequestRefund={handleRequestRefund}
        />
      )}
    </>
  );
};

export default SubscriptionDashboard;