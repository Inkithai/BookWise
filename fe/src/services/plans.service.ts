import { http, parseApiError } from '@/services/service';
import { getPlans as getSyncPlans, type PlanItem } from '@/services/sync-subscription.service';
import { invoiceSlugForSyncPlan } from '@/lib/plan-map';

/** Invoice plan row from super-admin API. */
export interface InvoicePlanRecord {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  is_public: boolean;
  is_vip?: boolean;
  features?: Record<string, boolean | string>;
  limits?: Record<string, number>;
}

/** Plan row for super-admin /plans (BookWise billing + Invoice entitlements). */
export interface AdminPlanRow {
  plan: PlanItem;
  planId: number;
  slug: string;
  invoiceSlug: string;
  invoicePlanId: number | null;
  entitlementId: number | null;
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  yearlyDiscountPercent: number | null;
  isTrial: boolean;
  iwActive: boolean;
  invoiceActive: boolean;
  invoicePublic: boolean;
  features: Record<string, boolean | string>;
  limits: Record<string, number>;
}

export interface PlanEntitlementsPayload {
  features: Record<string, boolean | string>;
  limits: Record<string, number>;
  name?: string;
}

export interface PlanVisibilityPayload {
  is_active?: boolean;
  is_public?: boolean;
}

export type AdminPlansLoadResult = {
  rows: AdminPlanRow[];
  platformError: string | null;
};

function buildAdminPlanRows(
  syncPlans: PlanItem[],
  invoicePlans: InvoicePlanRecord[],
): AdminPlanRow[] {
  const invoiceBySlug = new Map(invoicePlans.map((p) => [p.slug, p]));

  const fromSync = syncPlans.map((plan) => {
    const slug = (plan.slug || '').toLowerCase();
    const invoiceSlug = invoiceSlugForSyncPlan(slug);
    const invoicePlan = invoiceBySlug.get(invoiceSlug) ?? null;

    return {
      plan: plan,
      planId: plan.id,
      slug,
      invoiceSlug,
      invoicePlanId: invoicePlan?.id ?? null,
      entitlementId: invoicePlan?.id ?? null,
      name: invoicePlan?.name ?? plan.name,
      monthlyPrice: plan.amount_monthly,
      yearlyPrice: plan.amount_yearly,
      yearlyDiscountPercent: plan.yearly_discount_percent,
      isTrial: Boolean(plan.is_trial),
      iwActive: plan.is_active !== false,
      invoiceActive: invoicePlan ? invoicePlan.is_active !== false : false,
      invoicePublic: invoicePlan ? invoicePlan.is_public !== false : false,
      features: invoicePlan?.features ?? {},
      limits: invoicePlan?.limits ?? {},
    };
  });

  if (fromSync.length > 0) {
    return fromSync.sort(
      (a, b) => (a.plan.sort_order ?? 0) - (b.plan.sort_order ?? 0),
    );
  }

  return invoicePlans
    .map((invoicePlan) => ({
      plan: {
        id: 0,
        name: invoicePlan.name,
        slug: invoicePlan.slug,
        is_trial: false,
        is_vip: Boolean(invoicePlan.is_vip),
        is_active: invoicePlan.is_active !== false,
        trial_days: null,
        sort_order: 0,
        amount_monthly: null,
        amount_yearly: null,
        yearly_discount_percent: null,
      } satisfies PlanItem,
      planId: 0,
      slug: invoicePlan.slug,
      invoiceSlug: invoicePlan.slug,
      invoicePlanId: invoicePlan.id,
      entitlementId: invoicePlan.id,
      name: invoicePlan.name,
      monthlyPrice: null,
      yearlyPrice: null,
      yearlyDiscountPercent: null,
      isTrial: false,
      iwActive: false,
      invoiceActive: invoicePlan.is_active !== false,
      invoicePublic: invoicePlan.is_public !== false,
      features: invoicePlan.features ?? {},
      limits: invoicePlan.limits ?? {},
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadAdminPlanRows(): Promise<AdminPlanRow[]> {
  const result = await loadAdminPlansWithMeta();
  return result.rows;
}

export async function loadAdminPlansWithMeta(): Promise<AdminPlansLoadResult> {
  const [invoiceResult, iwBrowserResult] = await Promise.allSettled([
    http.get<{ success: boolean; data: InvoicePlanRecord[] }>(
      'super-admin/analytics/plans',
    ),
    getSyncPlans({ includeHidden: true }),
  ]);

  if (invoiceResult.status === 'rejected') {
    throw invoiceResult.reason;
  }

  const invoicePlans = invoiceResult.value.data?.data ?? [];
  let syncPlans: PlanItem[] = [];
  let platformError: string | null = null;

  if (iwBrowserResult.status === 'fulfilled') {
    syncPlans = iwBrowserResult.value;
  } else {
    platformError = parseApiError(iwBrowserResult.reason, 'load BookWise plans');

    try {
      const { data } = await http.get<{
        success: boolean;
        data: { invoice_plans: InvoicePlanRecord[]; sync_plans: PlanItem[] };
        meta?: { platform_error?: string | null };
      }>('super-admin/analytics/plans/dashboard');

      const serverSyncPlans = data.data?.sync_plans ?? [];
      if (serverSyncPlans.length > 0) {
        syncPlans = serverSyncPlans;
        platformError = null;
      } else if (data.meta?.platform_error) {
        platformError = data.meta.platform_error;
      }
    } catch {
      // Keep browser error message.
    }
  }

  return {
    rows: buildAdminPlanRows(syncPlans, invoicePlans),
    platformError: syncPlans.length > 0 ? null : platformError,
  };
}

/** Persist features/limits on Invoice API only (slug = platform or app slug). */
export async function updatePlanEntitlements(
  slug: string,
  payload: PlanEntitlementsPayload,
): Promise<void> {
  await http.put(`super-admin/analytics/plans/entitlements/${encodeURIComponent(slug)}`, payload);
}

/** Toggle Invoice plan active / public flags (upgrade page visibility). */
export async function updateInvoicePlanVisibility(
  slug: string,
  payload: PlanVisibilityPayload,
): Promise<InvoicePlanRecord> {
  const { data } = await http.patch<{ success: boolean; data: InvoicePlanRecord }>(
    `super-admin/analytics/plans/visibility/invoice/${encodeURIComponent(slug)}`,
    payload,
  );
  return data.data;
}

/** Toggle BookWise billing plan active flag. */
export async function updatePlanVisibility(
  planId: number,
  isActive: boolean,
): Promise<void> {
  await http.patch(`super-admin/analytics/plans/visibility/sync/${planId}`, {
    is_active: isActive,
  });
}

