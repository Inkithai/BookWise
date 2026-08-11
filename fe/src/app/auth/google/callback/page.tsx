// app/auth/google/callback/page.tsx
'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/slices/hooks';
import { setAuthUser, setFirstLogin, markTrialActivated } from '@/slices/authSlice';
import { storeUser } from '@/utils/auth';
import { handleGoogleCallback } from '@/services/google-auth.service';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { getPostLoginRedirectPath, UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';
import { isCompanyAccount } from '@/utils/account-context';

function GoogleCallbackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const dispatch     = useAppDispatch();
  const processed    = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code  = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google sign-in was cancelled.');
      router.replace('/auth/login');
      return;
    }

    if (!code) {
      toast.error('No authorisation code received from Google.');
      router.replace('/auth/login');
      return;
    }

    const run = async () => {
      try {
        const response = await handleGoogleCallback(code);

        if (!response.success) {
          // Check if OTP verification is required
          if ((response as any).auth_status === 'otp_required') {
            toast.warning('Please verify your email address first');
            router.replace(`/auth/otp-verification?email=${encodeURIComponent((response as any).data?.email || '')}`);
            return;
          }
          
          throw new Error(response.message || 'Authentication failed');
        }

        const { token, user, is_new_user } = response.data;

        // ── 1. Persist token FIRST ───────────────────────────────────────
        const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
        localStorage.setItem(tokenKey, token);

        // ── 2. Build plain user object ───────────────────────────────────
        const userData = {
          id:           user.id,
          email:        user.email,
          first_name:   user.first_name,
          last_name:    user.last_name,
          user_name:    user.user_name,
          phone:        user.phone        ?? null,
          is_active:    user.is_active    ?? 'Active',
          profile_img:  user.profile_img  ?? null,
          account_type: user.account_type ?? null,
          company:      user.company      ?? {},
          social_links: user.social_links ?? {},
          bank:         user.bank         ?? {},
          stripe:       user.stripe       ?? {},
          onboarding:   user.onboarding   ?? { has_seen_pricing: false, first_login: true },
          subscription: user.subscription ?? null,
          roles: Array.isArray(user.roles)
            ? user.roles.map((r: any) => (typeof r === 'string' ? r : r.name))
            : [],
        };

        // ── 3. Persist user + update Redux ───────────────────────────────
        storeUser(userData);
        dispatch(setAuthUser(userData as any));

        const serverSeenPricing = user.onboarding?.has_seen_pricing;
        const trialActivated = localStorage.getItem('trialActivated') === 'true';
        const hasSeenPricing = localStorage.getItem('hasSeenPricing') === 'true';
        const seenPricing = serverSeenPricing || trialActivated || hasSeenPricing;

        if (is_new_user) {
          localStorage.setItem('userFirstLogin', 'true');
          if (isCompanyAccount(userData)) {
            localStorage.setItem('hasSeenPricing', 'true');
            localStorage.setItem('trialActivated', 'true');
          } else {
            localStorage.removeItem('hasSeenPricing');
            localStorage.removeItem('trialActivated');
          }
          dispatch(setFirstLogin(!isCompanyAccount(userData)));
          toast.success(
            isCompanyAccount(userData)
              ? 'Welcome! Taking you to your dashboard…'
              : 'Welcome! Please choose a plan to get started.',
          );
          sessionStorage.setItem('justLoggedIn', 'true');
          router.replace(
            getPostLoginRedirectPath(userData, isCompanyAccount(userData)),
          );
        } else if (seenPricing) {
          localStorage.setItem('trialActivated', 'true');
          localStorage.setItem('hasSeenPricing', 'true');
          dispatch(markTrialActivated());
          dispatch(setFirstLogin(false));
          toast.success('Welcome!');
          sessionStorage.setItem('justLoggedIn', 'true');
          router.replace('/dashboard');
        } else {
          dispatch(setFirstLogin(true));
          toast.success('Welcome back! Please choose a plan to continue.');
          sessionStorage.setItem('justLoggedIn', 'true');
          router.replace(getPostLoginRedirectPath(userData, false));
        }
      } catch (err: any) {
        console.error('Google callback error:', err);
        toast.error(err.message || 'Google sign-in failed. Please try again.');
        router.replace('/auth/login');
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Signing you in…</h1>
          <p className="text-slate-500 text-sm">Please wait while we verify your Google account.</p>
        </div>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}