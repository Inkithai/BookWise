'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { getFullUser } from '@/slices/authSlice';
import { RootState } from '@/slices/store';

const PUBLIC_ROUTES = [
  '/',
  '/landing',
  '/Privacy',
  '/auth/login',
  '/auth/register',
  '/auth/otp-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/sso',
  '/payments/success',
  '/payments/error',
];

/**
 * AuthHydrator - Centralized auth data fetching
 * 
 * This component ensures getCurrentUser() is called ONLY ONCE
 * when the app initializes, preventing duplicate API calls
 * from multiple components (sidebar, pages, etc.)
 * 
 * Usage: Add to root layout.tsx once
 * 
 * IMPORTANT: Only activates AFTER AuthInitializer completes
 * to prevent race conditions
 */
export default function AuthHydrator() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { isAuthenticated, authUser, isFetchingUser, isInitialized, userFetchFailed } = useSelector(
    (state: RootState) => state.auth
  );
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Don't run until auth initialization is complete
    if (!isInitialized) return;
    
    // Only hydrate once per mount
    if (hasInitialized.current) return;
    if (!isAuthenticated) return; // Wait for auth to be ready

    // Skip hydration on public/auth routes — a stale token from an unverified
    // user (is_otp_verified=0) could trigger a spurious 403 on /me, causing a
    // console error on pages like the activation / reset-password page.
    const isPublicRoute = PUBLIC_ROUTES.some(
      (r) => pathname === r || pathname?.startsWith(r + '?')
    );
    if (isPublicRoute) return;

    hasInitialized.current = true;
    
    // Always fetch fresh user data from /auth/me on init so that role/permission
    // changes made by an admin are reflected without requiring a re-login.
    if (!isFetchingUser && !userFetchFailed) {
      dispatch(getFullUser() as any);
    }
  }, [dispatch, isAuthenticated, authUser, isFetchingUser, isInitialized, userFetchFailed, pathname]);

  // This component doesn't render anything
  return null;
}
