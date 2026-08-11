/** BookWise billing slugs → Invoice entitlement slugs (must match invoicingapi config). */

export const SYNC_TO_APP_PLAN_SLUG: Record<string, string> = {

  trial: 'free',

  free: 'free',

  pro: 'starter',

  premium: 'professional',

  starter: 'starter',

  professional: 'professional',

  enterprise: 'enterprise',
  vip: 'vip',
  VIP: 'vip',
  Starter: 'starter',
  Professional: 'professional',
  Enterprise: 'enterprise',
};



/** Canonical tiers and aliases (legacy dev slugs + production names). */

const TIER_ALIASES: Record<string, string[]> = {

  free: ['free', 'trial'],

  trial: ['trial', 'free'],

  starter: ['starter', 'pro', 'basic', 'standard'],

  pro: ['starter', 'pro'],

  professional: ['professional', 'premium'],

  premium: ['professional', 'premium'],

  enterprise: ['enterprise'],

};



export function canonicalPlanTier(slug: string): string {

  const s = slug.toLowerCase();

  for (const [tier, aliases] of Object.entries(TIER_ALIASES)) {

    if (aliases.includes(s)) {

      return tier;

    }

  }

  return s;

}



/** Stripe checkout badge tier (maps platform/app slugs → free | pro | premium). */

export function checkoutPlanTypeFromSlug(slug: string): 'free' | 'pro' | 'premium' {

  const tier = canonicalPlanTier(slug);

  if (tier === 'professional' || tier === 'premium' || tier === 'enterprise') {

    return 'premium';

  }

  if (tier === 'starter' || tier === 'pro') {

    return 'pro';

  }

  return 'free';

}



export function invoiceSlugForSyncPlan(slug: string): string {

  const key = slug.toLowerCase();

  return SYNC_TO_APP_PLAN_SLUG[key] ?? key;

}



/** True when two slugs are the same billing tier (e.g. trial ↔ free, pro ↔ starter). */

export function isSamePlanTier(slugA: string, slugB: string): boolean {

  return canonicalPlanTier(slugA) === canonicalPlanTier(slugB);

}



/**

 * Resolve slug to an exact value from GET /api/v1/plans (preserves DB casing, e.g. "Starter").

 */

export function resolveCheckoutSlug(

  slug: string,

  availablePlanSlugs: string[] = [],

): string {

  const refs = availablePlanSlugs

    .filter(Boolean)

    .map((slug) => ({ slug, lower: slug.toLowerCase() }));



  if (refs.length === 0) {

    return slug;

  }



  const inputLower = slug.toLowerCase();

  const direct = refs.find((r) => r.lower === inputLower);

  if (direct) {

    return direct.slug;

  }



  const tier = canonicalPlanTier(slug);

  const aliases = TIER_ALIASES[tier] ?? [tier];



  for (const alias of aliases) {

    const match = refs.find((r) => r.lower === alias);

    if (match) {

      return match.slug;

    }

  }



  return slug;

}



/** @deprecated Use resolveCheckoutSlug with slugs from GET /plans */

export function toBillingSlug(slug: string): string {

  return resolveCheckoutSlug(slug);

}



/** @deprecated Use resolveCheckoutSlug with available slugs from GET /plans */

export function slugForCheckout(slug: string): string {

  return resolveCheckoutSlug(slug);

}


