'use client';

import Link from 'next/link';
import { ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getExistingAccountDescription,
  getExistingAccountTitle,
  BOOKWISE_PORTAL_URL,
  type ExistingAccountField,
} from '@/lib/bookwise-existing-account';

type BookWiseExistingAccountAlertProps = {
  field: ExistingAccountField;
  featureName: 'Invoice' | 'DocuSign';
  className?: string;
};

export default function BookWiseExistingAccountAlert({
  field,
  featureName,
  className = '',
}: BookWiseExistingAccountAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-teal-300 bg-gradient-to-br from-teal-50 via-white to-teal-50 p-5 shadow-sm',
        className
      )}
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-teal-500/25" aria-hidden />
      <span className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-teal-900/10" aria-hidden />

      <div className="relative flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-900">
              BookWise account found
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              {getExistingAccountTitle(field)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {getExistingAccountDescription(featureName)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={BOOKWISE_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30"
            >
              Continue on BookWise
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center rounded-xl border border-teal-600 bg-white px-4 text-sm font-semibold text-teal-700 transition-all hover:bg-teal-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25"
            >
              Log in to {featureName}
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            Portal:{' '}
            <a
              href={BOOKWISE_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-700 underline-offset-2 hover:underline"
            >
              {BOOKWISE_PORTAL_URL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
