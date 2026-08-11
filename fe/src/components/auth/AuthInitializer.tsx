// src/components/auth/AuthInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { initializeAuth } from '@/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/slices/hooks';
import { setupAuthEventListeners } from '@/utils/auth';

// ✅ Change to your actual dashboard route
const DASHBOARD_ROUTE = '/dashboard';

// Routes that NEVER trigger any redirect — they handle their own navigation
const SELF_MANAGED_ROUTES = [
  '/auth/google/callback', // handles its own redirect after token exchange
  '/auth/sso',
];

// Routes only accessible when NOT logged in
const GUEST_ONLY_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/otp-verification',
];

// Routes accessible while authenticated (onboarding / marketing)
const AUTHENTICATED_PUBLIC_ROUTES = [
  '/pricing',
  '/landing',
];

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const pathname   = usePathname();
  const { isInitialized, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth() as any);
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = setupAuthEventListeners({
      onTokenExpired:  () => router.push('/auth/login?reason=token-expired'),
      onUnauthorized:  () => router.push('/auth/login?reason=unauthorized'),
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!pathname) return;

    // ── 1. Self-managed routes: NEVER interfere ──────────────────────────
    const isSelfManaged = SELF_MANAGED_ROUTES.some((r) => pathname.startsWith(r));
    if (isSelfManaged) {
      return;
    }

    const isGuestOnly            = GUEST_ONLY_ROUTES.some((r) => pathname.startsWith(r));
    const isAuthenticatedPublic  = AUTHENTICATED_PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (!isAuthenticated) {
      // ── 2. Not logged in ───────────────────────────────────────────────
      if (!isGuestOnly && !isAuthenticatedPublic) {
        router.push('/auth/login');
      }
      return;
    }

    // ── 3. Logged in on a guest-only page (login / register / etc.) ──────
    if (isGuestOnly) {
      // const trialActivated = localStorage.getItem('trialActivated');
      // const hasSeenPricing = localStorage.getItem('hasSeenPricing');
      // const seenPricing    = trialActivated === 'true' || hasSeenPricing === 'true';
      // const destination    = seenPricing ? DASHBOARD_ROUTE : '/pricing';

      // Always go to dashboard after login
      router.push(DASHBOARD_ROUTE);
    }
    // Authenticated on /pricing, /landing, /dashboard, etc. → no redirect needed

  }, [isInitialized, isAuthenticated, pathname, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}