'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  applyPlanAfterCheckout,
  loadMergedUpgradePlans,
  markPricingSeenOnServer,
  syncSubscriptionFromBookWise,
  type MergedUpgradePlan,
} from '@/services/subscription-plans.service';
import {
  cancelTeamFeature,
  createRefundRequest,
  createSubscriptionPaymentIntent,
  getFeatures,
  getRefundRequests,
  getTeamFeatures,
  reactivateTeamFeature,
  type TeamFeatureItem,
} from '@/services/sync-subscription.service';
import CancelSubscriptionModal from '@/components/subscription/CancelSubscriptionModal';
import { parseApiError } from '@/services/service';
import { useAppDispatch, useAppSelector } from '@/slices/hooks';
import { getFullUser, markPricingAsSeen, markTrialActivated } from '@/slices/authSlice';
import { isSamePlanTier, resolveCheckoutSlug } from '@/lib/plan-map';
import type { BillingInterval } from '@/lib/Subscriptiontypes';
import InvoicePlanStripeModal from './InvoicePlanStripeModal';
import { Button } from '@/components/ui/button';

import { buildPlanComparisonRows, buildComparisonTableFromMatrix } from '@/lib/plan-catalog';
import {
  COMPARE_PLANS_PATH,
  BOOKWISE_CONTACT_URL,
} from '@/lib/subscription-routes';

function buildFeatureRows(plan: MergedUpgradePlan): Array<{ text: string; included: boolean }> {
  return buildPlanComparisonRows(plan.limits ?? {}, plan.features ?? {});
}

export interface UpgradePlanSectionProps {
  /** First-login flow: show skip + mark onboarding complete after plan selection. */
  onboardingMode?: boolean;
}

export default function UpgradePlanSection({ onboardingMode = false }: UpgradePlanSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showComparison = searchParams?.get('view') === 'compare';
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.authUser);
  const subscription = authUser?.subscription;

  const [plans, setPlans] = useState<MergedUpgradePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceFeatureId, setInvoiceFeatureId] = useState<number | null>(null);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<MergedUpgradePlan | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [invoiceTeamFeature, setInvoiceTeamFeature] = useState<TeamFeatureItem | null>(null);
  const [refundedTeamFeatureIds, setRefundedTeamFeatureIds] = useState<Set<number>>(new Set());
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);

  const refreshRefundedIds = useCallback(async () => {
    try {
      const res = await getRefundRequests({ status: 'refunded', per_page: 200 });
      const ids = new Set<number>(
        (res.data || [])
          .map((r: { team_feature_id?: number }) => Number(r.team_feature_id))
          .filter((id: number) => Number.isFinite(id)),
      );
      setRefundedTeamFeatureIds(ids);
    } catch {
      setRefundedTeamFeatureIds(new Set());
    }
  }, []);

  const syncInvoiceSubscription = useCallback(async () => {
    try {
      await syncSubscriptionFromBookWise();
    } catch (error) {
      console.warn('syncSubscriptionFromBookWise failed', error);
    }
    try {
      await dispatch(getFullUser() as never);
    } catch (error) {
      console.warn('getFullUser after subscription change failed', error);
    }
  }, [dispatch]);

  const completeOnboarding = useCallback(async () => {
    try {
      await markPricingSeenOnServer();
    } catch {
      // Still update local flags if API fails
    }
    dispatch(markPricingAsSeen());
    dispatch(markTrialActivated());
    await dispatch(getFullUser() as never);
    if (onboardingMode) {
      toast.success('Welcome! Taking you to your dashboard…');
      router.replace('/dashboard');
    }
  }, [dispatch, onboardingMode, router]);

  const finishCheckout = useCallback(
    async (selectedPlan: MergedUpgradePlan) => {
      let syncWarning = false;

      try {
        await applyPlanAfterCheckout({
          platform_plan_slug: selectedPlan.plan.slug,
          amount:
            selectedPlan.isFree || selectedPlan.slug === 'enterprise'
              ? 0
              : billingInterval === 'yearly'
                ? selectedPlan.yearlyPrice
                : selectedPlan.monthlyPrice,
          billing_interval: billingInterval,
          subscription_type: selectedPlan.isFree ? 'free' : 'paid',
        });
      } catch (error) {
        console.warn('applyPlanAfterCheckout failed', error);
        syncWarning = true;
      }

      try {
        await syncSubscriptionFromBookWise();
      } catch (error) {
        console.warn('syncSubscriptionFromBookWise failed', error);
        syncWarning = true;
      }

      try {
        await dispatch(getFullUser() as never);
      } catch (error) {
        console.warn('getFullUser after checkout failed', error);
      }

      if (onboardingMode) {
        await completeOnboarding();
      } else if (syncWarning) {
        toast.success('Plan updated on BookWise. Refresh if limits look out of date.');
      } else {
        toast.success('Subscription updated. Invoice limits are now in sync.');
      }
    },
    [billingInterval, dispatch, onboardingMode, completeOnboarding],
  );

  const applyTeamFeatureSlug = useCallback(
    (teamFeatures: Awaited<ReturnType<typeof getTeamFeatures>>, featureId: number | null) => {
      if (!featureId) {
        setCurrentPlanSlug(null);
        return;
      }
      const invoiceTf = teamFeatures.find((tf) => tf.feature_id === featureId);
      const slug = (invoiceTf?.plan?.slug ?? '').trim();
      setCurrentPlanSlug(slug ? slug.toLowerCase() : null);
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [merged, features, teamFeatures] = await Promise.all([
        loadMergedUpgradePlans(),
        getFeatures(),
        getTeamFeatures(),
      ]);

      setPlans(merged);

      const invoiceFeature = features.find(
        (f) =>
          (f.name || '').toLowerCase().includes('invoice') ||
          (f.display_name || '').toLowerCase().includes('invoice'),
      );
      const featureId = invoiceFeature?.id ?? null;
      setInvoiceFeatureId(featureId);

      const invoiceTf = featureId
        ? teamFeatures.find((tf) => tf.feature_id === featureId) ?? null
        : null;
      setInvoiceTeamFeature(invoiceTf);

      if (!onboardingMode) {
        try {
          await syncSubscriptionFromBookWise();
          await dispatch(getFullUser() as never);
          const teamFeaturesAfterSync = await getTeamFeatures();
          applyTeamFeatureSlug(teamFeaturesAfterSync, featureId);
          setInvoiceTeamFeature(
            featureId
              ? teamFeaturesAfterSync.find((tf) => tf.feature_id === featureId) ?? null
              : null,
          );
        } catch {
          applyTeamFeatureSlug(teamFeatures, featureId);
        }
        await refreshRefundedIds();
      } else {
        applyTeamFeatureSlug(teamFeatures, featureId);
      }
    } catch (error) {
      toast.error(parseApiError(error, 'load plans'));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [applyTeamFeatureSlug, dispatch, onboardingMode, refreshRefundedIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizePlanLabel = (name: string) =>
    name.toLowerCase().replace(/\s+plan$/i, '').trim();

  /** Single source for "current plan" card — avoids platform slug vs app name matching different tiers. */
  const isCurrentPlan = useCallback(
    (plan: MergedUpgradePlan) => {
      if (subscription?.plan_name) {
        return (
          normalizePlanLabel(subscription.plan_name) === normalizePlanLabel(plan.name)
        );
      }
      if (currentPlanSlug) {
        return isSamePlanTier(currentPlanSlug, plan.slug);
      }
      return false;
    },
    [currentPlanSlug, subscription?.plan_name],
  );

  const currentPlanCard = useMemo(
    () => plans.find(isCurrentPlan) ?? null,
    [plans, isCurrentPlan],
  );

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await completeOnboarding();
    } catch (error) {
      toast.error(parseApiError(error, 'continue'));
    } finally {
      setSkipping(false);
    }
  };

  const handleSelect = async (plan: MergedUpgradePlan) => {
    if (plan.slug === 'enterprise') {
      window.open(BOOKWISE_CONTACT_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isCurrentPlan(plan)) {
      return;
    }

    if (!invoiceFeatureId) {
      toast.error('Invoice feature is not available on BookWise. Contact support.');
      return;
    }

    const availablePlanSlugs = plans.map((p) => p.plan.slug);
    const checkoutSlug = resolveCheckoutSlug(plan.plan.slug, availablePlanSlugs);
    const price = billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

    if (plan.isFree || price <= 0) {
      setBusySlug(plan.slug);
      let iwCheckoutSucceeded = false;
      try {
        await createSubscriptionPaymentIntent([
          {
            feature_id: invoiceFeatureId,
            plan_slug: checkoutSlug,
            billing_interval: billingInterval,
          },
        ]);
        iwCheckoutSucceeded = true;
        await finishCheckout(plan);
      } catch (error) {
        if (iwCheckoutSucceeded) {
          try {
            await finishCheckout(plan);
            toast.success('Plan updated on BookWise. Refresh if limits look out of date.');
          } catch {
            toast.warning(
              'Plan was updated on BookWise but Invoice sync is delayed. Please refresh in a moment.',
            );
          }
        } else {
          toast.error(parseApiError(error, 'activate plan'));
        }
      } finally {
        setBusySlug(null);
      }
      return;
    }

    setCheckoutPlan(plan);
  };

  const comparisonRows = useMemo(() => buildComparisonTableFromMatrix(), []);
  const comparisonColumns = useMemo(
    () =>
      [
        { key: 'free' as const, label: 'Free' },
        { key: 'pro' as const, label: 'Business Pro' },
        { key: 'premium' as const, label: 'Business Premium' },
        { key: 'enterprise' as const, label: 'Enterprise' },
      ] as const,
    [],
  );
  const currentPlanDisplay = currentPlanCard?.name ?? subscription?.plan_name ?? null;

  const teamFeatureId = invoiceTeamFeature?.id ?? null;
  const teamFeatureStatus = (invoiceTeamFeature?.status ?? '').toLowerCase();
  const isOnActiveFreePlan =
    (subscription?.plan_slug ?? '').toLowerCase() === 'free' ||
    (subscription?.plan_name ?? '').toLowerCase() === 'free' ||
    (subscription?.plan_name ?? '').toLowerCase() === 'free plan';
  const bannerPlanStatus =
    isOnActiveFreePlan && subscription?.status === 'active'
      ? 'active'
      : teamFeatureStatus || null;
  const isPaidSubscription =
    invoiceTeamFeature?.subscription_type === 'paid' ||
    (invoiceTeamFeature?.plan?.slug &&
      !['free', 'trial', 'vip'].includes((invoiceTeamFeature.plan.slug || '').toLowerCase()));
  const canCancelSubscription =
    !onboardingMode &&
    teamFeatureId != null &&
    teamFeatureStatus === 'active' &&
    isPaidSubscription &&
    subscription?.status !== 'trialing';
  const canReactivateSubscription =
    !onboardingMode &&
    teamFeatureId != null &&
    (teamFeatureStatus === 'cancelled' || teamFeatureStatus === 'inactive') &&
    !refundedTeamFeatureIds.has(teamFeatureId);

  const reloadTeamFeature = useCallback(async () => {
    if (!invoiceFeatureId) return;
    const teamFeatures = await getTeamFeatures();
    const tf = teamFeatures.find((row) => row.feature_id === invoiceFeatureId) ?? null;
    setInvoiceTeamFeature(tf);
    applyTeamFeatureSlug(teamFeatures, invoiceFeatureId);
  }, [applyTeamFeatureSlug, invoiceFeatureId]);

  const handleCancelOnly = async (id: number) => {
    setSubscriptionBusy(true);
    try {
      await cancelTeamFeature(id);
      await reloadTeamFeature();
      await syncInvoiceSubscription();
      toast.success('Subscription cancelled. You can reactivate anytime.');
    } catch (error) {
      toast.error(parseApiError(error, 'cancel subscription'));
      throw error;
    } finally {
      setSubscriptionBusy(false);
    }
  };

  const handleRequestRefund = async (id: number, reason?: string) => {
    setSubscriptionBusy(true);
    try {
      const res = await createRefundRequest({
        team_feature_id: id,
        reason,
        cancel_subscription: true,
      });
      if (res?.success === false) {
        throw new Error(res?.message || 'Failed to submit refund request');
      }
      await reloadTeamFeature();
      await refreshRefundedIds();
      await syncInvoiceSubscription();
      toast.success('Refund request submitted. Super admin will review and process manually.');
    } catch (error) {
      toast.error(parseApiError(error, 'refund request'));
      throw error;
    } finally {
      setSubscriptionBusy(false);
    }
  };

  const handleReactivate = async () => {
    if (!teamFeatureId) return;
    setSubscriptionBusy(true);
    try {
      await reactivateTeamFeature(teamFeatureId);
      await reloadTeamFeature();
      await syncInvoiceSubscription();
      toast.success('Subscription reactivated.');
    } catch (error) {
      toast.error(parseApiError(error, 'reactivate subscription'));
    } finally {
      setSubscriptionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {onboardingMode && (
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white px-5 py-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-xl font-bold text-slate-900">Your 1-month trial has started</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                You already have <strong>full access with no limits</strong> for{' '}
                {subscription?.trial_days_total ?? 30} days. Explore the dashboard, then pick a paid
                plan below if you want to keep premium features after the trial.
              </p>
              <p className="text-sm text-slate-600">
                If you do not subscribe, you will <strong>automatically move to the Free plan</strong>{' '}
                when the trial ends — no payment required.
              </p>
              {subscription?.trial_ends_at && (
                <p className="text-sm font-medium text-teal-800">
                  Trial ends{' '}
                  {new Date(subscription.trial_ends_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {subscription.available_days != null && (
                    <> ({subscription.available_days} days left)</>
                  )}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => void handleSkip()} disabled={skipping}>
              {skipping ? 'Going to dashboard…' : 'Continue to dashboard'}
            </Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="font-semibold text-slate-800 mb-1">During trial</p>
              <p>All features unlocked. No invoice or usage caps.</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="font-semibold text-slate-800 mb-1">After trial</p>
              <p>Upgrade to Pro or Premium, or stay on Free automatically.</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <p className="font-semibold text-slate-800 mb-1">Reminders</p>
              <p>We email you 7, 3, and 1 day before trial ends.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            {onboardingMode
              ? 'Select a plan to get started. Billing is handled on api.bookwise.io.'
              : 'Plans and payments are managed on api.bookwise.io. Invoice validates features and limits after each change.'}
          </p>
          {!onboardingMode && subscription?.status && (
            <p className="text-xs text-slate-500 mt-1">
              Invoice access:{' '}
              <span className="font-medium text-slate-700">{subscription.plan_name}</span>
              {' · '}
              <span className="capitalize">{subscription.status.replace('_', ' ')}</span>
              {subscription.trial_ends_at && subscription.status === 'trialing' && (
                <> · Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start">
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingInterval === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('yearly')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              billingInterval === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {currentPlanDisplay && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800">
            Current subscribed plan:{' '}
            <span className="font-semibold">{currentPlanDisplay}</span>
            {bannerPlanStatus && (
              <>
                {' · '}
                <span className="capitalize">{bannerPlanStatus.replace('_', ' ')}</span>
              </>
            )}
          </p>
        </div>
      )}

      {(canCancelSubscription || canReactivateSubscription) && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Manage subscription</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {canCancelSubscription
                ? 'Cancel now and reactivate later, or request a refund for super-admin review.'
                : 'Your subscription is cancelled. Reactivate to restore paid access.'}
            </p>
            {invoiceTeamFeature?.cancelled_at && (
              <p className="text-xs text-slate-500 mt-1">
                Cancelled{' '}
                {new Date(invoiceTeamFeature.cancelled_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canCancelSubscription && (
              <Button
                type="button"
                variant="outline"
                disabled={subscriptionBusy}
                onClick={() => setCancelModalOpen(true)}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Cancel subscription
              </Button>
            )}
            {canReactivateSubscription && (
              <Button
                type="button"
                disabled={subscriptionBusy}
                onClick={() => void handleReactivate()}
              >
                {subscriptionBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Reactivate subscription'
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {showComparison && (
        <div id="plan-comparison" className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Compare plans</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Free and VIP tiers are assigned automatically — only paid plans are selectable below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/settings?tab=upgrade-plan')}
              className="text-sm font-medium text-teal-600 hover:underline self-start"
            >
              Back to plan cards
            </button>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Feature</th>
                {comparisonColumns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 text-slate-600">{row.name}</td>
                  {comparisonColumns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-slate-800">
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : plans.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No plans available from BookWise API.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const featureRows = buildFeatureRows(plan);
            const displayPrice =
              billingInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const isCurrent = isCurrentPlan(plan);
            const isEnterprise = plan.slug === 'enterprise';
            const busy = busySlug === plan.slug;
            const highlighted =
              plan.invoiceSlug === 'professional' || (onboardingMode && plan.isFree);

            return (
              <div
                key={`${plan.slug}-${plan.invoiceSlug}`}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                  highlighted ? 'ring-2 ring-teal-500 border-teal-200' : 'border-slate-200'
                } ${isCurrent ? 'bg-teal-50/40' : ''}`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                    Current plan
                  </span>
                )}

                <div className="mb-4 pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-teal-600">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                <div className="mb-5">
                  {plan.isFree && !isEnterprise ? (
                    <span className="text-3xl font-bold text-slate-900">Free</span>
                  ) : isEnterprise ? (
                    <span className="text-3xl font-bold text-slate-900">Custom</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-slate-500">£</span>
                      <span className="text-3xl font-bold text-slate-900">
                        {displayPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {billingInterval === 'yearly' ? '/yr' : '/mo'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isCurrent || busy}
                  onClick={() => void handleSelect(plan)}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold mb-5 ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 cursor-default'
                      : highlighted
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                  } disabled:opacity-60`}
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </span>
                  ) : isCurrent ? (
                    'Current plan'
                  ) : isEnterprise ? (
                    'Contact sales'
                  ) : (
                    'Subscribe'
                  )}
                </button>

                <ul className="space-y-2 flex-1">
                  {featureRows.map((row, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {row.included ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span className={row.included ? 'text-slate-700' : 'text-slate-400'}>
                        {row.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {onboardingMode && (
        <p className="text-center text-xs text-slate-500">
          Choose Business Pro or Business Premium to continue after your trial, or use{' '}
          <button
            type="button"
            onClick={() => router.push(COMPARE_PLANS_PATH)}
            className="font-medium text-teal-600 hover:underline"
          >
            compare plans
          </button>
          .
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        Enterprise pricing?{' '}
        <a
          href={BOOKWISE_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-600 hover:underline"
        >
          Contact us on BookWise
        </a>
      </p>

      {cancelModalOpen && teamFeatureId && (
        <CancelSubscriptionModal
          featureName={currentPlanDisplay ?? 'Invoice'}
          teamFeatureId={teamFeatureId}
          onClose={() => setCancelModalOpen(false)}
          onCancelOnly={handleCancelOnly}
          onRequestRefund={handleRequestRefund}
        />
      )}

      {checkoutPlan && invoiceFeatureId && (
        <InvoicePlanStripeModal
          invoiceFeatureId={invoiceFeatureId}
          planSlug={checkoutPlan.slug}
          iwCheckoutSlug={resolveCheckoutSlug(
            checkoutPlan.plan.slug,
            plans.map((p) => p.plan.slug),
          )}
          planLabel={checkoutPlan.name}
          monthlyPrice={checkoutPlan.monthlyPrice}
          yearlyPrice={checkoutPlan.yearlyPrice}
          billingInterval={billingInterval}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={async () => {
            const plan = checkoutPlan;
            setCheckoutPlan(null);
            await finishCheckout(plan);
            if (!onboardingMode) void load();
          }}
        />
      )}
    </div>
  );
}
