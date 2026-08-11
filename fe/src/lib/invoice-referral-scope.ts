import { isSubUser } from "@/utils/account-context";
import { getInvoiceAuthUser } from "@/lib/invoice-user-email";
import type { ReferralRecord } from "@/services/referral.service";

export type InvoiceReferralScope = "own" | "team";

export type InvoiceReferralRole = "user" | "admin" | "super-admin";

/** Company owners / admins who may withdraw or apply referral commission. */
export function canUseReferralCommission(user: unknown): boolean {
  const role = getInvoiceReferralRole(user);
  if (role === "admin" || role === "super-admin") return true;
  if (!user || typeof user !== "object") return false;
  const u = user as { account_type?: string; can_manage_company_profile?: boolean };
  const accountType = String(u.account_type || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (accountType === "company" || accountType === "admin" || accountType === "superadmin") {
    return true;
  }
  return u.can_manage_company_profile === true;
}

export function getInvoiceReferralRole(user: unknown): InvoiceReferralRole {
  if (!user || typeof user !== "object") return "user";
  const u = user as { account_type?: string; roles?: unknown[] };
  const accountType = String(u.account_type || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (accountType === "superadmin") return "super-admin";
  if (accountType === "admin") return "admin";

  const roles = Array.isArray(u.roles) ? u.roles : [];
  const names = roles.map((r) => {
    if (typeof r === "string") return r.toLowerCase();
    if (r && typeof r === "object" && "name" in r) {
      return String((r as { name?: string }).name || "").toLowerCase();
    }
    return "";
  });
  if (names.some((n) => n === "super-admin" || n === "superadmin" || n === "super admin")) {
    return "super-admin";
  }
  if (names.some((n) => n === "admin")) return "admin";
  return "user";
}

/**
 * Sub-users always see only their own referrals.
 * Admins, super-admins, and company owners see team-scoped referrals only (never platform-wide).
 */
export function getInvoiceReferralScope(user: unknown): InvoiceReferralScope {
  if (!user || isSubUser(user)) return "own";
  const role = getInvoiceReferralRole(user);
  if (role === "admin" || role === "super-admin") return "team";
  const u = user as { can_manage_company_profile?: boolean; account_type?: string };
  const accountType = String(u.account_type || "").toLowerCase();
  if (
    u.can_manage_company_profile === true &&
    (accountType === "company" || accountType === "admin")
  ) {
    return "team";
  }
  return "own";
}

export function getInvoiceReferralScopeFromStorage(): InvoiceReferralScope {
  return getInvoiceReferralScope(getInvoiceAuthUser());
}

/** Dedupe referral rows from dashboard + list API responses. */
export function mergeReferralRecords(
  ...sources: (ReferralRecord[] | ReferralRecord | null | undefined)[]
): ReferralRecord[] {
  const byId = new Map<number, ReferralRecord>();
  for (const source of sources) {
    if (!source) continue;
    const list = Array.isArray(source) ? source : [source];
    for (const r of list) {
      if (r?.id != null) byId.set(r.id, r);
    }
  }
  return Array.from(byId.values());
}

/**
 * Non-admin overview: rows tied to the logged-in user (as referrer or as referred).
 * Uses email fallback when Invoice user id differs from BookWise ids.
 */
export function filterReferralsForOwnScopeUser(
  records: ReferralRecord[],
  user: unknown,
  fallbackEmail = ""
): ReferralRecord[] {
  if (!records.length) return [];

  const u = user && typeof user === "object" ? (user as { id?: number; email?: string }) : {};
  const userId = Number(u.id);
  const email = String(u.email || fallbackEmail || "").trim().toLowerCase();

  if (!userId && !email) return records;

  const filtered = records.filter((r) => {
    if (userId > 0) {
      if (r.referred_user_id === userId || r.referral_code_owner_id === userId) {
        return true;
      }
    }
    if (email) {
      const referredEmail = r.referred_user?.email?.trim().toLowerCase();
      const ownerEmail = r.code_owner?.email?.trim().toLowerCase();
      if (referredEmail === email || ownerEmail === email) return true;
    }
    return false;
  });

  return filtered.length > 0 ? filtered : records;
}
