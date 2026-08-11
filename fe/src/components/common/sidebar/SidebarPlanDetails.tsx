'use client';

import Link from 'next/link';
import { CalendarClock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSubscriptionPlanSummary } from '@/lib/subscription-display';
import type { UserSubscription } from '@/services/interface/User';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SidebarPlanDetailsProps = {
  subscription?: UserSubscription | null;
  isCollapsed?: boolean;
  className?: string;
  /** Sub-users cannot manage billing — hide plan block. */
  hidden?: boolean;
};

export function SidebarPlanDetails({
  subscription,
  isCollapsed = false,
  className,
  hidden = false,
}: SidebarPlanDetailsProps) {
  if (hidden) {
    return null;
  }

  const { planName, statusLabel, endInfo } = getSubscriptionPlanSummary(subscription);

  const href = '/settings?tab=upgrade-plan';
  const tooltipText = endInfo
    ? `${planName} — ${endInfo.line}`
    : `${planName} — ${statusLabel}`;

  if (isCollapsed) {
    return (
      <div className={cn('px-2 pb-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className="flex h-11 w-11 mx-auto items-center justify-center rounded-xl border border-sidebar-border/60 bg-sidebar-accent/30 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
              aria-label={tooltipText}
            >
              <CreditCard size={18} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            <p className="font-semibold text-sm">{planName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{statusLabel}</p>
            {endInfo && (
              <p className="text-xs mt-1 flex items-center gap-1">
                <CalendarClock className="w-3 h-3 shrink-0" />
                {endInfo.line}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={cn('px-3 pb-2', className)}>
      <Link
        href={href}
        className="block rounded-lg border border-sidebar-border/60 bg-sidebar-accent/25 px-3 py-2.5 hover:bg-sidebar-accent/50 transition-colors group"
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CreditCard size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
              Your plan
            </p>
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight mt-0.5 group-hover:text-primary transition-colors">
              {planName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize mt-0.5">
              {statusLabel}
            </p>
            {endInfo && (
              <p className="text-[11px] text-sidebar-foreground/65 mt-1.5 flex items-start gap-1.5 leading-snug">
                <CalendarClock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
                <span>
                  <span className="text-sidebar-foreground/45">{endInfo.label}: </span>
                  {endInfo.dateText ?? endInfo.line}
                </span>
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
