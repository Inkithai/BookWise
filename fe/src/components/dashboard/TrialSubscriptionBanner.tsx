'use client';

import Link from 'next/link';
import { CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import { useAppSelector } from '@/slices/hooks';
import { hasFullTrialAccess } from '@/lib/plan-access';
import { UPGRADE_PLAN_PATH, COMPARE_PLANS_PATH } from '@/lib/subscription-routes';
import { isSubUser } from '@/utils/account-context';
import { Button } from '@/components/ui/button';

export default function TrialSubscriptionBanner() {
  const authUser = useAppSelector((s) => s.auth.authUser);
  const subscription = authUser?.subscription;

  if (!subscription || !hasFullTrialAccess(subscription)) {
    return null;
  }

  if (isSubUser(authUser)) {
    return null;
  }

  const daysLeft = subscription.available_days ?? null;
  const totalDays = subscription.trial_days_total ?? 30;
  const trialEnd = subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-50 dark:from-teal-950/40 dark:via-gray-900 dark:to-teal-950/30 dark:border-teal-800 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 dark:bg-teal-900/50 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-200">
            <Sparkles className="w-3.5 h-3.5" />
            {totalDays}-day full-access trial
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Welcome — every feature is unlocked during your trial
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            For <strong>{totalDays} days</strong> after sign-up there are <strong>no plan limits</strong>{' '}
            (invoices, clients, templates, recurring statements, and more). When
            the trial ends you can <strong>subscribe</strong> to Business Pro or Business Premium, or
            you will <strong>automatically continue on the Free plan</strong> at no charge.
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
            <li>During trial: unlimited access — no restrictions</li>
            <li>After trial: upgrade for premium features, or stay on Free with standard limits</li>
            <li>We email you at 7, 3, and 1 day(s) before your trial ends</li>
          </ul>
          {trialEnd && (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-200">
              <CalendarClock className="w-4 h-4 shrink-0" />
              Trial ends {trialEnd}
              {daysLeft != null && (
                <span className="text-teal-600 dark:text-teal-300">
                  ({daysLeft} day{daysLeft === 1 ? '' : 's'} left)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href={UPGRADE_PLAN_PATH}>
              View plans &amp; pricing
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={COMPARE_PLANS_PATH}>Compare Free vs paid</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
