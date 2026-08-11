'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useAppSelector } from '@/slices/hooks';
import { canUseFeature, planRestrictionMessage } from '@/lib/plan-access';
import { UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';
import { Button } from '@/components/ui/button';

const FEATURE_LABELS: Record<string, string> = {
  recurring_statements: 'Recurring statements',
  crm: 'CRM',
  accept_online_payments: 'Accept online payments',
  multiple_businesses: 'Multiple businesses',
  dashboard_advanced: 'Advanced dashboard',
};

type PlanFeatureGateProps = {
  feature: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export default function PlanFeatureGate({
  feature,
  children,
  title,
  description,
}: PlanFeatureGateProps) {
  const authUser = useAppSelector((s) => s.auth.authUser);
  const allowed = canUseFeature(authUser, feature);

  if (allowed) {
    return <>{children}</>;
  }

  const label = FEATURE_LABELS[feature] ?? feature.replace(/_/g, ' ');

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title ?? `${label} is not on your plan`}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
        {description ?? planRestrictionMessage(authUser)}
      </p>
      <Button asChild>
        <Link href={UPGRADE_PLAN_PATH}>Upgrade plan</Link>
      </Button>
    </div>
  );
}
