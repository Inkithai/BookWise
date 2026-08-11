import type { User, UserSubscription } from '@/services/interface/User';



/** Full access during an active 1-month trial. */

export function hasFullTrialAccess(subscription?: UserSubscription | null): boolean {

  if (!subscription) {

    return false;

  }

  if (subscription.full_trial_access) {

    return true;

  }

  if (subscription.status !== 'trialing') {

    return false;

  }

  if (!subscription.trial_ends_at) {

    return true;

  }

  return new Date(subscription.trial_ends_at).getTime() > Date.now();

}



export function canUseApp(user?: User | null): boolean {

  if (!user?.subscription) {

    return false;

  }

  const { status } = user.subscription;

  return (

    hasFullTrialAccess(user.subscription) ||

    status === 'active' ||

    status === 'trialing' ||

    status === 'past_due'

  );

}



export function needsUpgrade(user?: User | null): boolean {

  if (!user?.subscription) {

    return true;

  }

  return ['trial_end', 'inactive', 'canceled'].includes(user.subscription.status ?? '');

}



export function isPlanLimitError(error: unknown): boolean {

  if (!error || typeof error !== 'object') return false;

  const err = error as { response?: { data?: { code?: string } } };

  return err.response?.data?.code === 'plan_limit_exceeded';

}



export function isPlanFeatureError(error: unknown): boolean {

  if (!error || typeof error !== 'object') return false;

  const err = error as { response?: { data?: { code?: string } } };

  return err.response?.data?.code === 'plan_feature_restricted';

}



export function isPlanRestrictionError(error: unknown): boolean {

  return isPlanLimitError(error) || isPlanFeatureError(error);

}



export function planRestrictionMessage(user?: User | null): string {

  if (user?.subscription?.status === 'trial_end') {

    return 'Your trial has ended. Upgrade to a paid plan or continue on the Free Plan.';

  }

  if (user?.subscription?.status === 'inactive') {

    return 'Your subscription is inactive. Please renew to continue.';

  }

  return 'Upgrade your plan to use this feature.';

}



export function canUseFeature(

  user: User | null | undefined,

  featureKey: string,

): boolean {

  if (!user?.subscription) {

    return false;

  }

  if (hasFullTrialAccess(user.subscription)) {

    return true;

  }

  const status = String(user.subscription.status ?? '');

  if (!['active', 'trialing', 'trial_end', 'past_due'].includes(status)) {

    return false;

  }

  const features = user.subscription.features ?? {};

  if (features.all) {

    return true;

  }

  const key = featureKey.replace(/^feature\./, '').replace(/-/g, '_');

  if (key === 'accept_online_payment' || key === 'accept_online_payments') {

    return Boolean(features.accept_online_payments);

  }

  if (key === 'multiple_business' || key === 'multiple_businesses') {

    return Boolean(features.multiple_businesses);

  }

  if (key === 'recurring_invoice' || key === 'recurring_statements') {

    return Boolean(features.recurring_statements);

  }

  if (key === 'crm' || key === 'feature_crm') {

    return Boolean(features.crm);

  }

  if (key === 'dashboard_advanced' || key === 'advanced_dashboard') {

    const tier = String(features.dashboard_tier ?? 'standard').toLowerCase();

    return tier === 'advanced' || tier === 'custom';

  }

  if (key === 'any_currency' || key === 'bill_any_currency') {

    return Boolean(features.any_currency);

  }

  return Boolean((features as Record<string, unknown>)[key]);

}



export function getPlanLimit(

  user: User | null | undefined,

  limitKey: string,

): number | null {

  if (!user?.subscription) {

    return null;

  }

  if (hasFullTrialAccess(user.subscription)) {

    return null;

  }

  const limits = user.subscription.limits ?? {};

  const value = limits[limitKey];

  if (value == null || value === -1) {

    return null;

  }

  return Number(value);

}



export function allowedTemplates(user?: User | null): string[] {

  if (!user?.subscription) {

    return ['classic'];

  }

  if (hasFullTrialAccess(user.subscription)) {

    return ['classic', 'minimal', 'modern', 'modern1'];

  }

  if (user.subscription.allowed_templates?.length) {

    return user.subscription.allowed_templates;

  }

  const access = user.subscription.templates_access ?? 'preview';

  if (access === 'all' || access === 'custom') {

    return ['classic', 'minimal', 'modern', 'modern1'];

  }

  if (access === 'three') {

    return ['classic', 'minimal', 'modern'];

  }

  return ['classic'];

}



export function canUseTemplate(user: User | null | undefined, templateKey: string): boolean {

  return allowedTemplates(user).includes(templateKey.toLowerCase());

}



export function canAddAnotherBusiness(

  user: User | null | undefined,

  existingCompanyCount: number,

): boolean {

  if (existingCompanyCount < 1) {

    return true;

  }

  return canUseFeature(user, 'multiple_businesses');

}



export function dashboardTier(user?: User | null): 'standard' | 'advanced' | 'custom' {

  if (!user?.subscription) {

    return 'standard';

  }

  if (hasFullTrialAccess(user.subscription)) {

    return 'advanced';

  }

  const features = user.subscription.features ?? {};

  if (features.all) {

    return 'custom';

  }

  const tier = String(features.dashboard_tier ?? 'standard').toLowerCase();

  if (tier === 'custom') return 'custom';

  if (tier === 'advanced') return 'advanced';

  return 'standard';

}



export function dashboardTierAtLeast(

  user: User | null | undefined,

  minimum: 'standard' | 'advanced' | 'custom',

): boolean {

  const order = { standard: 1, advanced: 2, custom: 3 };

  return order[dashboardTier(user)] >= order[minimum];

}



export function canUseAdvancedDashboard(user?: User | null): boolean {

  return dashboardTierAtLeast(user, 'advanced');

}



export function canUseCustomDashboard(user?: User | null): boolean {

  return dashboardTierAtLeast(user, 'custom');

}



export function canUseRecurringStatements(user?: User | null): boolean {

  return canUseFeature(user, 'recurring_statements');

}



export function canUseCrm(user?: User | null): boolean {

  return canUseFeature(user, 'crm');

}


