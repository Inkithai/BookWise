import { http } from '@/services/service';
import { getPlans as getSyncPlans, type PlanItem } from '@/services/sync-subscription.service';
import { invoiceSlugForSyncPlan } from '@/lib/plan-map';
import {
  dedupeUpgradePlansByTier,
  isPublicUpgradePlan,
  resolvePlanDisplayPrice,
} from '@/lib/upgrade-plan-filter';

/** Entitlements from Invoice API (features & limits for validation UI). */
export interface PlanEntitlement {
  id: number;
  slug: string;
  platform_plan_slug: string;
  name: string;
  description?: string | null;
  is_free?: boolean;
  is_vip?: boolean;
  is_public?: boolean;
  is_active?: boolean;
  trial_eligible?: boolean;
  monthly_price?: number;
  yearly_price?: number;
  features?: Record<string, boolean | string>;
  limits?: Record<string, number>;
}

/** Merged plan for upgrade UI: platform pricing + Invoice entitlements. */
export interface MergedUpgradePlan {
  plan: PlanItem;
  slug: string;
  invoiceSlug: string;
  entitlements: PlanEntitlement | null;
  monthlyPrice: number;
  yearlyPrice: number;
  name: string;
  description: string;
  features: Record<string, boolean | string>;
  limits: Record<string, number>;
  isFree: boolean;
}

export async function getPlanEntitlements(): Promise<PlanEntitlement[]> {
  const { data } = await http.get<{ success: boolean; data: PlanEntitlement[] }>('plan-entitlements');
  return data.data ?? [];
}

export async function syncSubscriptionFromBookWise(): Promise<void> {
  await http.post('subscription/sync');
}

/** Update Invoice user_subscriptions right after platform confirm-payment. */
export async function applyPlanAfterCheckout(payload: {
  platform_plan_slug: string;
  subscription_type?: 'paid' | 'free' | 'trial';
  amount?: number;
  billing_interval?: 'monthly' | 'yearly';
}): Promise<void> {
  await http.post('subscription/apply-plan', {
    subscription_type: 'paid',
    billing_interval: 'monthly',
    ...payload,
  });
}

export async function markPricingSeenOnServer(): Promise<void> {
  await http.post('admin/users/mark-pricing-seen');
}

export async function loadMergedUpgradePlans(): Promise<MergedUpgradePlan[]> {
  const [syncPlans, entitlements] = await Promise.all([getSyncPlans(), getPlanEntitlements()]);

  const byInvoiceSlug = new Map(entitlements.map((e) => [e.slug, e]));
  const bySlugLower = new Map(
    entitlements.map((e) => [(e.platform_plan_slug || '').toLowerCase(), e]),
  );

  const merged: MergedUpgradePlan[] = syncPlans
    .map((plan) => {
      const slug = (plan.slug || '').toLowerCase();
      const invoiceSlug = invoiceSlugForSyncPlan(slug);
      const ent =
        bySlugLower.get(slug) ??
        byInvoiceSlug.get(invoiceSlug) ??
        null;

      const monthlyPrice = resolvePlanDisplayPrice(ent, plan, 'monthly');
      const yearlyPrice = resolvePlanDisplayPrice(ent, plan, 'yearly');

      return {
        plan: plan,
        slug,
        invoiceSlug,
        entitlements: ent,
        monthlyPrice,
        yearlyPrice,
        name: ent?.name ?? plan.name,
        description: ent?.description ?? '',
        features: ent?.features ?? {},
        limits: ent?.limits ?? {},
        isFree:
          (ent?.is_free === true || plan.is_trial === true) &&
          monthlyPrice <= 0 &&
          yearlyPrice <= 0 &&
          slug !== 'enterprise',
      };
    })
    .filter((plan) => isPublicUpgradePlan(plan.plan, plan.entitlements));

  // Enterprise (entitlements-only, no BookWise checkout slug) — contact sales
  const enterprise = byInvoiceSlug.get('enterprise');
  if (
    enterprise &&
    enterprise.is_public !== false &&
    enterprise.is_active !== false &&
    !merged.some((m) => m.invoiceSlug === 'enterprise')
  ) {
    merged.push({
      plan: {
        id: enterprise.id,
        name: enterprise.name,
        slug: 'enterprise',
        is_trial: false,
        is_vip: false,
        is_active: true,
        trial_days: null,
        sort_order: 99,
        amount_monthly: null,
        amount_yearly: null,
        yearly_discount_percent: null,
      },
      slug: 'enterprise',
      invoiceSlug: 'enterprise',
      entitlements: enterprise,
      monthlyPrice: 0,
      yearlyPrice: 0,
      name: enterprise.name,
      description: enterprise.description ?? '',
      features: enterprise.features ?? {},
      limits: enterprise.limits ?? {},
      isFree: false,
    });
  }

  return dedupeUpgradePlansByTier(
    merged.sort((a, b) => (a.plan.sort_order ?? 0) - (b.plan.sort_order ?? 0))
  );
}
