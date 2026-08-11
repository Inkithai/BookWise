'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { verifyOtp, resendOtp } from '@/services/service';
import { activateAfterOtp } from '@/services/bookwise-sync.service';
import { cn } from '@/lib/utils';
import { AuthAlert, AuthButton } from './ui/AuthControls';

export default function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value) || loading) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (loading) return;

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (loading) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only allow numeric input
    if (!/^\d+$/.test(pastedData)) return;
    
    // Take only the first 6 digits
    const digits = pastedData.slice(0, 6).split('');
    
    // Fill the OTP array
    const newOtp = [...otp];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit;
      }
    });
    
    setOtp(newOtp);
    setError('');
    
    // Focus on the next empty input or the last one
    const nextIndex = Math.min(digits.length, 6) - 1;
    if (nextIndex < 5) {
      inputRefs.current[nextIndex + 1]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('Email not found. Please register again.');
      return;
    }

    const enteredOtp = otp.join('');

    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      const verifyResponse = await verifyOtp(email, enteredOtp);

      if (verifyResponse?.data?.success === false) {
        throw new Error(
          verifyResponse.data?.message || 'OTP verification failed.'
        );
      }

      try {
        await activateAfterOtp(email);
      } catch (iwErr) {
        console.warn('BookWise activation after OTP (non-blocking):', iwErr);
      }

      toast.success('Registration successful! You can now sign in.');
      
      // Clear any stale auth state across tabs
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      
      router.push('/auth/login');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid or expired OTP';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    try {
      setLoading(true);
      await resendOtp(email);
      toast.success('OTP resent successfully');
    } catch (err: any) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* OTP boxes */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1} of 6`}
            maxLength={1}
            value={digit}
            disabled={loading}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={(e) => handlePaste(e)}
            className={cn(
              'h-14 w-12 rounded-xl border bg-white text-center text-2xl font-semibold text-slate-900 shadow-sm',
              'transition-[border-color,box-shadow,background-color] duration-200 outline-none',
              'focus:border-teal-600 focus:ring-4 focus:ring-teal-500/15',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              error
                ? 'border-red-400 bg-red-50/60'
                : digit
                  ? 'border-teal-600 bg-teal-50/60'
                  : 'border-slate-200 hover:border-slate-300'
            )}
          />
        ))}
      </div>

      {error && <AuthAlert title={error} />}

      {/* Verify */}
      <AuthButton
        onClick={handleSubmit}
        loading={loading}
        loadingText="Verifying…"
        icon={<ShieldCheck className="h-[18px] w-[18px]" />}
      >
        Verify code
      </AuthButton>

      {/* Resend */}
      <p className="text-center text-sm text-slate-500">
        Didn&apos;t receive the code?{' '}
        <button
          type="button"
          disabled={loading}
          className="font-medium text-teal-700 transition-colors hover:text-teal-900 hover:underline disabled:opacity-50"
          onClick={handleResend}
        >
          Resend it
        </button>
      </p>
    </div>
  );
}
