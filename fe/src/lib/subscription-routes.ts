import { isCompanyAccount, isSubUser } from '@/utils/account-context';

/** Canonical URL for plan selection / upgrade (replaces /pricing). */
export const UPGRADE_PLAN_PATH = '/settings?tab=upgrade-plan';

/** Opens the plan comparison table on the pricing tab. */
export const COMPARE_PLANS_PATH = '/settings?tab=upgrade-plan&view=compare';

/** Contact sales / enterprise enquiry (Customer Support tab). */
export const CONTACT_SALES_PATH = '/settings?tab=customer-support';

/** BookWise marketing site contact section. */
export const BOOKWISE_CONTACT_URL = 'https://bookwise.io/#contact';

/** Personal host accounts see pricing onboarding; company hosts and sub-users do not. */
export function shouldShowPricingOnboarding(
  user: { account_type?: string | null; can_manage_company_profile?: boolean } | null | undefined,
): boolean {
  if (!user) return false;
  if (isSubUser(user)) return false;
  if (isCompanyAccount(user)) return false;
  return true;
}

export function getPostLoginRedirectPath(
  user: { account_type?: string | null; can_manage_company_profile?: boolean } | null | undefined,
  seenPricing: boolean,
): string {
  if (!shouldShowPricingOnboarding(user) || seenPricing) {
    return '/dashboard';
  }
  return UPGRADE_PLAN_PATH;
}

export function isUpgradePlanPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/settings' || pathname.startsWith('/settings');
}

export function isOnUpgradePlanTab(searchParams: URLSearchParams | null): boolean {
  return searchParams?.get('tab') === 'upgrade-plan';
}
