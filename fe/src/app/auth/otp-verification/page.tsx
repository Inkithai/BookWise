// app/auth/otp-verification/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { Landmark, MailCheck } from 'lucide-react';

import OtpVerificationForm from '../../../components/auth/OtpVerificationForm';
import PlatformHighlights from '../../../components/auth/PlatformHighlights';

const BRAND = 'BookWise';

export default function OtpVerificationPage() {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link href="/landing" className="mb-8 flex items-center gap-2 text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
            <Landmark className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">{BRAND}</span>
        </Link>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <MailCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verify your email</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter the 6-digit code we sent to your registered email address.
            </p>
          </div>
          <Suspense fallback={<div className="text-sm text-slate-500">Loading verification form…</div>}>
            <OtpVerificationForm />
          </Suspense>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden bg-gradient-to-br from-teal-700 to-teal-900 lg:flex lg:flex-col lg:justify-center lg:overflow-y-auto lg:p-12">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold leading-tight">One last check.</h2>
          <p className="mt-4 text-teal-50/90">
            We verify every sign-in so your ledger, bank feeds and client data stay yours alone.
          </p>
          <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <PlatformHighlights
              tone="dark"
              limit={8}
              title="Everything your books need"
              subtitle="Select a capability to see what it covers"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
