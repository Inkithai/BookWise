'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/slices/hooks';

function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  const accountType = String((user as any)?.account_type ?? '').toLowerCase().replace(/[\s_]/g, '-');
  if (accountType === 'super-admin') return true;
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
    : [];
  return roles.some((r) => {
    const lower = r.toLowerCase().replace(/[\s_]/g, '-');
    return lower === 'super-admin';
  });
}

/**
 * Wraps page content that is ONLY accessible to super-admin.
 * Company admins, sub-users and regular company accounts are all redirected to /dashboard.
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isInitialized, isAuthenticated, authUser, user } = useAppSelector((s) => s.auth);
  const resolvedUser = authUser ?? user;

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (resolvedUser && !isSuperAdmin(resolvedUser)) {
      router.replace('/dashboard');
    }
  }, [isInitialized, isAuthenticated, resolvedUser, router]);

  if (!isInitialized || !isAuthenticated) return null;
  if (resolvedUser && !isSuperAdmin(resolvedUser)) return null;

  return <>{children}</>;
}
