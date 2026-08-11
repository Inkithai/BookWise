/**
 * Permission utilities for sub-user access control.
 *
 * Sub-users have a `permissions` array (e.g. ["dashboard.view", "invoice.create"]).
 * Admin / super-admin users always have full access — permission checks are skipped.
 *
 * Usage:
 *   import { hasPermission, usePermissions } from '@/utils/permissions';
 *
 *   // In component:
 *   const { can } = usePermissions();
 *   if (!can('invoice.create')) return null;
 */

import { useAppSelector } from '@/slices/hooks';
import { isSubUser } from '@/utils/account-context';

// ── Permission check (pure function) ──────────────────────────────────────────

/**
 * Returns true when the user is allowed the given permission.
 * Admin/super-admin always returns true.
 * Non-admin users must have the permission in their `permissions` array.
 */
export const hasPermission = (user: any, permission: string): boolean => {
  if (user == null) return false;

  // Use the robust isSubUser() which falls back to role-based detection
  // (team-member role) when can_manage_company_profile flag is absent from
  // the API response — prevents the admin bypass incorrectly granting access.
  const isSubUserAccount = isSubUser(user);

  if (!isSubUserAccount) {
    const roles: string[] = Array.isArray(user?.roles)
      ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
      : [];
    const hasAdmin = roles.some((r) => {
      const lower = r.toLowerCase().replace(/[\s_-]/g, '');
      return lower === 'admin' || lower === 'superadmin';
    });
    if (hasAdmin) return true;
  }

  // Check permissions array.
  // For sub-users: deny by default when permissions haven't loaded yet (null/undefined).
  // This prevents a flash of access before the real permissions array arrives from the API.
  // For owners/admins (isSubUserAccount = false): permissive fallback is safe since they
  // already passed the admin role check above.
  const perms = user?.permissions;
  if (!Array.isArray(perms)) {
    // Sub-users must explicitly have the permission — deny until loaded.
    // Non-sub-users (owners) are already allowed by the admin role check above.
    return !isSubUserAccount;
  }
  return perms.includes(permission);
};

/**
 * Returns true if the user can manage the company profile (edit company,
 * connect/disconnect Stripe, edit bank details).
 * Admin/super-admin always returns true.
 */
export const canManageCompanyProfile = (user: any): boolean => {
  if (user == null) return false;
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
    : [];
  const hasAdmin = roles.some((r) => {
    const lower = r.toLowerCase().replace(/[\s_-]/g, '');
    return lower === 'admin' || lower === 'superadmin';
  });
  if (hasAdmin) return true;
  return user.can_manage_company_profile !== false;
};

// ── React hook ───────────────────────────────────────────────────────────────

/**
 * Convenience hook that reads the current user from Redux auth state and
 * provides a `can(permission)` function.
 *
 * Usage:
 *   const { can, canManage, isSubUser } = usePermissions();
 *   can('invoice.create')     // → boolean
 *   canManage                 // → can edit company profile / stripe / bank
 *   isSubUser                 // → true if sub-user
 */
export function usePermissions() {
  const reduxUser = useAppSelector((state: any) => state.auth.user);
  const reduxAuthUser = useAppSelector((state: any) => state.auth.authUser);
  const isAuthenticated = useAppSelector((state: any) => state.auth.isAuthenticated);
  const user = reduxAuthUser || reduxUser;

  const can = (permission: string): boolean => hasPermission(user, permission);
  const canManage = canManageCompanyProfile(user);

  const isSubUserFlag = isSubUser(user);

  // True while authenticated but full user data not yet hydrated from API.
  // Prevents stale localStorage cache from flashing AccessDenied on hard refresh.
  const isHydrating = isAuthenticated && !reduxAuthUser;

  return { can, canManage, isSubUser: isSubUserFlag, user, isHydrating };
}

// ── Nav-item permission mapping ──────────────────────────────────────────────

/**
 * Maps nav item names to the permission required to view them.
 * Items not listed here are always visible.
 */
export const NAV_PERMISSION_MAP: Record<string, string> = {
  // These items are HIDDEN from sidebar when permission is OFF.
  // All others show in sidebar always but show AccessDenied at page level.
  'Invoice': 'invoice.view',
  'Users': 'user.view',
  'Receipts': 'receipt.view',
  'Roles & Permissions': 'role.view',
  // Referrals: visible to all authenticated users (admin, sub-user, owner).
};
