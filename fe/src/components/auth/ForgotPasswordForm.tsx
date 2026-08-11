// components/auth/ForgotPasswordForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { AuthAlert, AuthButton, AuthInput, AuthLabel } from './ui/AuthControls';
import { forgotPassword } from "@/services/service";
import { toast } from "sonner";
import axios from "axios";
import { useSearchParams } from 'next/navigation';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const [emailFromParam, setEmailFromParam] = useState(false);

  useEffect(() => {
  const emailFromQuery = searchParams.get('email');
  if (emailFromQuery) {
    setEmail(emailFromQuery);
    setEmailFromParam(true)
  }
}, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await forgotPassword(email);
      if (response.success) {
        toast.success(response.message || "Reset link sent to your email!");
        setSuccess(true);
      }
    } catch (err) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        if (error.response?.status === 422) {
          // Validation errors
          const errorMessages = errorData?.errors 
            ? (Object.values(errorData.errors).flat() as string[])
            : [];
          const errorMsg = errorMessages[0] || errorData?.message || 'Please check your email address';
          setError(errorMsg);
          toast.error(errorMsg);
        } else {
          const message = errorData?.message || 'Failed to send reset instructions. Please try again.';
          // setError(message);
          toast.error(message);
        }
      } else {
        
        setError('Failed to send reset instructions. Please try again.');
        // toast.error('Something went wrong!');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full">
        <div className="space-y-6">
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-teal-900">Check your inbox</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              We&apos;ve sent a password reset link to your email address.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              If you don&apos;t see it within a few minutes, check your junk or spam folder.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>

          <footer className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Copyright © 2017-{new Date().getFullYear()} BookWise.
              All rights reserved. With ♥ by BookWise
            </p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <AuthAlert title={error} />}

        <div className="space-y-1.5">
          <AuthLabel htmlFor="email" required>
            Email address
          </AuthLabel>
          <AuthInput
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            icon={<Mail />}
            hasError={Boolean(error)}
            required
            disabled={loading || emailFromParam}
            autoComplete="email"
          />
        </div>

        <AuthButton
          type="submit"
          loading={loading}
          loadingText="Sending link…"
          icon={<Mail className="h-[18px] w-[18px]" />}
        >
          Send reset link
        </AuthButton>
      </form>

      <div className="text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        Copyright © 2017-{new Date().getFullYear()} BookWise. All rights reserved.
      </p>
    </div>
  );
}
