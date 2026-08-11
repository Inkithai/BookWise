// app/auth/reset-password/page.tsx
'use client'

import { Suspense } from 'react';
import Link from 'next/link';
import { Landmark, ShieldCheck } from 'lucide-react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

const BRAND = 'BookWise';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 px-6 py-12 sm:px-12">
      <Link href="/landing" className="mb-10 flex items-center gap-2 text-slate-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
          <Landmark className="h-5 w-5" />
        </span>
        <span className="text-lg font-semibold">{BRAND}</span>
      </Link>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8">
          <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set a new password</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Choose a strong password you haven&apos;t used before.
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
