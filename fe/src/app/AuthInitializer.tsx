//src/app/AuthInitializer.tsx

'use client';



import { useEffect, useMemo } from 'react';

import { useRouter, usePathname } from 'next/navigation';

import { initializeAuth } from '@/slices/authSlice';

import { useAppDispatch, useAppSelector } from '@/slices/hooks';

import { setupAuthEventListeners } from '@/utils/auth';

import { UPGRADE_PLAN_PATH, shouldShowPricingOnboarding } from '@/lib/subscription-routes';



const PUBLIC_ROUTES = [

  '/',

  '/landing',

  '/Privacy',

  '/terms-and-conditions',

  '/auth/login',

  '/auth/register',

  '/auth/otp-verification',

  '/auth/forgot-password',

  '/auth/reset-password',

  '/auth/sso',

  '/payments/success',

  '/payments/error',

];



const SELF_MANAGED_ROUTES = [

  '/auth/google/callback',

  '/auth/sso',

];



function isOnUpgradePlanTab(pathname: string | null): boolean {
  if (pathname !== '/settings' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tab') === 'upgrade-plan';
}

export default function AuthInitializer({ children }: { children: React.ReactNode }) {

  const dispatch = useAppDispatch();

  const router = useRouter();

  const pathname = usePathname();



  const { isInitialized, isAuthenticated, authUser, userFetchFailed } = useAppSelector((state) => state.auth);



  useEffect(() => {

    dispatch(initializeAuth() as any);

  }, [dispatch]);



  useEffect(() => {

    const unsubscribe = setupAuthEventListeners({

      onTokenExpired: () => {

        router.replace('/auth/login?reason=token-expired');

      },

      onUnauthorized: () => {

        router.replace('/auth/login?reason=unauthorized');

      },

    });

    return () => {

      if (unsubscribe) unsubscribe();

    };

  }, [router]);



  const redirectPath = useMemo(() => {

    if (!isInitialized) return null;



    const isSelfManaged = SELF_MANAGED_ROUTES.some((r) => pathname?.startsWith(r));

    if (isSelfManaged) return null;



    if (isAuthenticated && !authUser) return null;



    const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');



    if (!isAuthenticated && !isPublicRoute) {

      return '/auth/login';

    }



    if (isAuthenticated && authUser) {

      const trialActivated = typeof window !== 'undefined'

        ? localStorage.getItem('trialActivated') === 'true'

        : false;

      const hasSeenPricingLocal = typeof window !== 'undefined'

        ? localStorage.getItem('hasSeenPricing') === 'true'

        : false;



      const seenPricing =

        trialActivated ||

        hasSeenPricingLocal ||

        authUser.onboarding?.has_seen_pricing === true;



      const pricingExempt =

        pathname === '/trial-expired' ||

        pathname === '/subscription/expired' ||

        pathname === '/subscription/activated';



      const canShowPricing = shouldShowPricingOnboarding(authUser);



      if (!seenPricing && !pricingExempt && canShowPricing) {

        if (pathname === '/pricing') return UPGRADE_PLAN_PATH;

        if (!isOnUpgradePlanTab(pathname)) return UPGRADE_PLAN_PATH;

      }



      if (authUser.subscription?.status === 'trial_end' && !isOnUpgradePlanTab(pathname)) {

        return UPGRADE_PLAN_PATH;

      }

      if (authUser.subscription?.status === 'inactive' && pathname !== '/subscription/expired') {

        return '/subscription/expired';

      }



      if (pathname === '/subscription/expired' && authUser.subscription?.status !== 'inactive') {

        return '/dashboard';

      }

      if (pathname === '/trial-expired' && authUser.subscription?.status !== 'trial_end') {

        return '/dashboard';

      }



      if (pathname === '/pricing' && seenPricing) {

        return '/dashboard';

      }



      if (pathname?.startsWith('/auth/') || pathname === '/' || pathname === '/landing') {

        const justLoggedIn = typeof window !== 'undefined'

          ? sessionStorage.getItem('justLoggedIn') === 'true'

          : false;

        if (justLoggedIn) {

          sessionStorage.removeItem('justLoggedIn');

          return seenPricing || !canShowPricing ? '/dashboard' : UPGRADE_PLAN_PATH;

        }

        return null;

      }

    }



    return null;

  }, [isInitialized, isAuthenticated, authUser, pathname]);



  useEffect(() => {

    if (redirectPath) {

      router.replace(redirectPath);

    }

  }, [redirectPath, router]);



  const isSelfManaged = SELF_MANAGED_ROUTES.some((r) => pathname?.startsWith(r));



  if (!isSelfManaged && !isInitialized) {

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


