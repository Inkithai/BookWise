import { canonicalPlanTier } from '@/lib/plan-map';
import type { PlanItem } from '@/services/sync-subscription.service';
import type { PlanEntitlement } from '@/services/subscription-plans.service';

/** Internal platform slugs never shown on the public upgrade page. */
const HIDDEN_UPGRADE_IW_SLUGS = new Set(['vip', 'trial', 'free']);

export function isPublicUpgradePlan(
  plan: PlanItem,
  entitlements: PlanEntitlement | null
): boolean {
  const slug = (plan.slug || '').toLowerCase();

  if (HIDDEN_UPGRADE_IW_SLUGS.has(slug)) return false;
  if (plan.is_vip) return false;
  if (plan.is_trial) return false;
  if (plan.is_active === false) return false;
  if (entitlements?.is_vip) return false;
  if (entitlements?.is_public === false) return false;
  if (entitlements?.is_active === false) return false;

  // Zero-price tiers that are not enterprise are internal (Free/VIP) — never selectable.
  const monthly = Number(plan.amount_monthly ?? 0);
  const yearly = Number(plan.amount_yearly ?? 0);
  if (slug !== 'enterprise' && monthly <= 0 && yearly <= 0 && entitlements?.is_free) {
    return false;
  }

  return true;
}

/** Deduplicate merged cards by billing tier (prevents duplicate Free cards). */
export function dedupeUpgradePlansByTier<T extends { slug: string }>(plans: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const plan of plans) {
    const tier = canonicalPlanTier(plan.slug);
    if (seen.has(tier)) continue;
    seen.add(tier);
    out.push(plan);
  }

  return out;
}

export function resolvePlanDisplayPrice(
  entitlements: PlanEntitlement | null,
  plan: PlanItem,
  interval: 'monthly' | 'yearly'
): number {
  const entPrice =
    interval === 'yearly'
      ? Number(entitlements?.yearly_price ?? 0)
      : Number(entitlements?.monthly_price ?? 0);

  const iwPrice =
    interval === 'yearly'
      ? Number(plan.amount_yearly ?? 0)
      : Number(plan.amount_monthly ?? 0);

  if (entPrice > 0 && iwPrice > 0) return Math.min(entPrice, iwPrice);
  if (entPrice > 0) return entPrice;
  if (iwPrice > 0) return iwPrice;
  return 0;
}
