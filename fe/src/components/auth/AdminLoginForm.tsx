// components/auth/AdminLoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { oauth2Service } from '@/services/oauth.service';
import { getPostLoginRedirectPath } from '@/lib/subscription-routes';
import { toast } from 'sonner';
import { setAuthUser, setFirstLogin } from '@/slices/authSlice';
import { useAppDispatch } from '@/slices/hooks';
import { storeUser } from '@/utils/auth';
import axios from 'axios';
import {
  AuthAlert,
  AuthButton,
  AuthCheckbox,
  AuthFieldError,
  AuthInput,
  AuthLabel,
  AuthRevealToggle,
} from './ui/AuthControls';

// Enhanced API Error Response type
interface ApiErrorResponse {
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  data?: {
    error?: string;
    message?: string;
  };
}

export default function AdminLoginForm() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});

  const router   = useRouter();
  const dispatch = useAppDispatch();

  const extractErrorMessage = (errorData: unknown): string => {
    if (axios.isAxiosError(errorData)) {
      const data = errorData.response?.data as ApiErrorResponse | undefined;
      if (data?.message) return data.message;
      if (data?.error)   return data.error;
      if (data?.errors) {
        const msgs = Object.entries(data.errors)
          .map(([, messages]) => (Array.isArray(messages) ? messages[0] : messages))
          .filter(Boolean);
        if (msgs.length > 0) return msgs.join(', ');
      }
      return errorData.response?.statusText || 'An error occurred during login';
    }
    if (errorData instanceof Error) return errorData.message;
    if (typeof errorData === 'string') return errorData;
    return 'An unknown error occurred';
  };

  const extractFieldErrors = (errorData: unknown): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (axios.isAxiosError(errorData)) {
      const data = errorData.response?.data as ApiErrorResponse | undefined;
      if (data?.errors) {
        Object.entries(data.errors).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages) ? messages[0] : (messages as string);
        });
      }
    }
    return errors;
  };

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      if (!isValidEmail(email)) {
        setFieldErrors({ email: 'Please enter a valid email address' });
        setLoading(false);
        return;
      }

      const response = await oauth2Service.login(email, password);

      // Check if OTP verification is required (backend returns auth_status: 'otp_required')
      if (response.auth_status === 'otp_required') {
        toast.warning('Please verify your email address first');
        router.push(`/auth/otp-verification?email=${encodeURIComponent(email)}`);
        setLoading(false);
        return;
      }

      const rawUser = response.data?.user || response.data;
      const userData = {
        id:           rawUser.id,
        email:        rawUser.email,
        user_name:    rawUser.user_name || rawUser.username,
        username:     rawUser.username || rawUser.user_name,
        first_name:   rawUser.first_name,
        last_name:    rawUser.last_name,
        account_type: rawUser.account_type ?? null,
        can_manage_company_profile: rawUser.can_manage_company_profile,
        permissions:  rawUser.permissions  || [],
        roles:        rawUser.roles        || [],
        onboarding:   rawUser.onboarding   ?? null,
        subscription: rawUser.subscription ?? null,
      };

      const token = response.data?.token || response.authorization?.access_token;
      if (token) {
        const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
        localStorage.setItem(tokenKey, token);
      }

      storeUser(userData);
      dispatch(setAuthUser(userData as any));

      const serverSeenPricing = rawUser.onboarding?.has_seen_pricing;
      const trialActivated = localStorage.getItem('trialActivated');
      const hasSeenPricing = localStorage.getItem('hasSeenPricing');
      const seenPricing =
        serverSeenPricing || trialActivated === 'true' || hasSeenPricing === 'true';

      if (serverSeenPricing) {
        localStorage.setItem('trialActivated', 'true');
        localStorage.setItem('hasSeenPricing', 'true');
      }

      dispatch(setFirstLogin(!seenPricing));
      sessionStorage.setItem('justLoggedIn', 'true');
      toast.success('Login successful!');

      router.replace(getPostLoginRedirectPath(userData, Boolean(seenPricing)));
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      const fieldErrs    = extractFieldErrors(error);
      setError(errorMessage);
      setFieldErrors(fieldErrs);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      {error && <AuthAlert title={error} details={fieldErrors} />}

      {/* Email */}
      <div className="space-y-1.5">
        <AuthLabel htmlFor="email" required>
          Email address
        </AuthLabel>
        <AuthInput
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
          }}
          placeholder="you@company.com"
          icon={<Mail />}
          hasError={Boolean(fieldErrors.email)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          required
          disabled={loading}
          autoComplete="email"
        />
        <AuthFieldError id="email-error">{fieldErrors.email}</AuthFieldError>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <AuthLabel
          htmlFor="password"
          required
          hint={
            <Link
              href={
                email.trim()
                  ? `/auth/forgot-password?email=${encodeURIComponent(email.trim())}`
                  : '/auth/forgot-password'
              }
              className="text-xs font-medium text-teal-700 transition-colors hover:text-teal-900 hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          Password
        </AuthLabel>
        <AuthInput
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError('password');
          }}
          placeholder="Enter your password"
          icon={<Lock />}
          hasError={Boolean(fieldErrors.password)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          trailing={
            <AuthRevealToggle
              shown={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              disabled={loading}
            />
          }
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <AuthFieldError id="password-error">{fieldErrors.password}</AuthFieldError>
      </div>

      {/* Remember me */}
      <AuthCheckbox
        id="rememberMe"
        checked={rememberMe}
        onChange={setRememberMe}
        disabled={loading}
        className="pt-0.5"
      >
        Keep me signed in
      </AuthCheckbox>

      {/* Submit */}
      <AuthButton
        type="submit"
        loading={loading}
        loadingText="Signing in…"
        icon={<ArrowRight className="h-[18px] w-[18px]" />}
        className="mt-1 flex-row-reverse"
      >
        Sign in
      </AuthButton>
    </form>
  );
}
