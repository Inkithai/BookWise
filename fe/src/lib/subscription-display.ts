import type { UserSubscription } from '@/services/interface/User';

export type PlanEndInfo = {
  label: string;
  dateText: string | null;
  line: string;
};

export type SubscriptionPlanSummary = {
  planName: string;
  statusLabel: string;
  endInfo: PlanEndInfo | null;
};

function formatPlanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function capitalizeStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Cancelled or inactive paid subs should read as Free in compact UI (handles stale sync). */
function shouldShowAsFreePlan(subscription: UserSubscription): boolean {
  const planSlug = (subscription.plan_slug ?? '').toLowerCase();
  const planName = (subscription.plan_name ?? '').toLowerCase();

  if (planSlug === 'free' || planName === 'free' || planName === 'free plan') {
    return true;
  }

  const status = (subscription.status ?? '').toLowerCase();

  return ['inactive', 'cancelled', 'canceled', 'trial_end'].includes(status);
}

/**
 * Human-readable plan name + end/renewal line for sidebar and compact UI.
 */
export function getSubscriptionPlanSummary(
  subscription?: UserSubscription | null
): SubscriptionPlanSummary {
  if (!subscription) {
    return {
      planName: 'Free',
      statusLabel: 'No subscription',
      endInfo: null,
    };
  }

  const onFreeTier = shouldShowAsFreePlan(subscription);
  const planName = onFreeTier
    ? 'Free'
    : subscription.plan_name?.trim() || 'Free';
  const statusLabel = onFreeTier
    ? 'Active'
    : capitalizeStatus(subscription.status);

  const planSlug = (subscription.plan_slug ?? '').toLowerCase();
  const isVipPlan =
    planSlug === 'vip' || planName.toLowerCase() === 'vip';

  if (subscription.plan_type === 'forever' && isVipPlan) {
    return {
      planName,
      statusLabel,
      endInfo: {
        label: 'Access',
        dateText: null,
        line: 'Lifetime access',
      },
    };
  }

  if (
    (subscription.status === 'trialing' || subscription.plan_type === 'trial') &&
    subscription.trial_ends_at
  ) {
    const dateText = formatPlanDate(subscription.trial_ends_at);
    const days =
      subscription.available_days != null
        ? ` (${subscription.available_days} day${subscription.available_days === 1 ? '' : 's'} left)`
        : '';
    return {
      planName,
      statusLabel: 'Trial',
      endInfo: {
        label: 'Trial ends',
        dateText,
        line: `Trial ends ${dateText}${days}`,
      },
    };
  }

  if (
    subscription.next_payment_at &&
    planName.toLowerCase() !== 'free' &&
    !onFreeTier
  ) {
    const dateText = formatPlanDate(subscription.next_payment_at);
    return {
      planName,
      statusLabel,
      endInfo: {
        label: 'Renews',
        dateText,
        line: `Renews ${dateText}`,
      },
    };
  }

  return {
    planName,
    statusLabel,
    endInfo: null,
  };
}
