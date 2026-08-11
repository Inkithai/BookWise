export type AccountContextType = "personal" | "company";

export interface NormalizedCompanyAccount {
  id: number;
  company_name: string;
  is_active?: boolean;
}


export const getResolvedContextType = (userData: any): AccountContextType => {
  const explicitType = userData?.current_context?.type ?? userData?.active_context_type;
  if (explicitType === "company" || explicitType === "personal") return explicitType;

  // If account_type is 'company', default to company context
  const accountType = String(userData?.account_type ?? "").toLowerCase();
  if (accountType === "company") return "company";

  const rawCompanyId = Number(
    userData?.current_context?.company_id ??
    userData?.active_company_id ??
    userData?.company_id
  );
  if (Number.isFinite(rawCompanyId) && rawCompanyId > 0) return "company";

  return "personal";
};

export const getResolvedActiveCompanyId = (userData: any): number | null => {
  const explicitType = userData?.current_context?.type ?? userData?.active_context_type;
  if (explicitType === "personal") return null;

  const accountType = String(userData?.account_type ?? "").toLowerCase();

  const rawCompanyId = Number(
    userData?.current_context?.company_id ??
    userData?.active_company_id ??
    userData?.company_id
  );
  if (Number.isFinite(rawCompanyId) && rawCompanyId > 0) return rawCompanyId;

  // Company-type accounts: try first available company
  if (accountType === "company") {
    const firstCompany = userData?.available_companies?.[0];
    const fallbackId = Number(firstCompany?.company_id ?? firstCompany?.id);
    if (Number.isFinite(fallbackId) && fallbackId > 0) return fallbackId;
  }

  return null;
};

/**
 * Returns true if the user is a sub-user under a company/personal account.
 *
 * Detection strategy:
 *  1. `can_manage_company_profile === false` — authoritative backend flag set
 *     for all sub-users regardless of their role name (admin, team-member, custom).
 *  2. Exclude genuine super-admins (role name 'super-admin') even if the flag
 *     is somehow absent.
 */
export const isSubUser = (userData: any): boolean => {
  if (userData == null) return false;

  const accountType = String(userData?.account_type || '').toLowerCase();

  // Super-admins are never sub-users — check first regardless of other flags.
  if (accountType.includes('super-admin') || accountType.includes('super admin')) {
    return false;
  }
  const roles: string[] = Array.isArray(userData?.roles)
    ? userData.roles.map((r: any) => (typeof r === 'string' ? r : r?.name ?? ''))
    : [];
  const isSuperAdmin = roles.some((r) => {
    const lower = r.toLowerCase().replace(/[\s_-]/g, '');
    return lower === 'superadmin';
  });
  if (isSuperAdmin) return false;

  // Authoritative backend flag — checked before account_type because sub-users
  // registered as personal accounts still have account_type='personal', so
  // using account_type as the primary gate would incorrectly return false.
  if (userData.can_manage_company_profile === true) return false;
  if (userData.can_manage_company_profile === false) return true;

  // Flag absent: explicit sub-user account types.
  if (accountType === 'sub-user' || accountType === 'employee' || accountType === 'staff') {
    return true;
  }
  // Explicit owner account types — not sub-users.
  if (accountType === 'personal' || accountType === 'company') {
    return false;
  }

  // Last resort: role-based detection.
  const hasTeamMemberRole = roles.some((r) => r.toLowerCase().replace(/[\s_-]/g, '') === 'teammember');
  if (hasTeamMemberRole) return true;

  return false;
};

/** Host owner / company-registered account (not a team sub-user). */
export const isCompanyAccount = (userData: any): boolean => {
  if (userData == null) return false;
  if (isSubUser(userData)) return false;
  return String(userData?.account_type ?? '').toLowerCase() === 'company';
};

export const normalizeAvailableCompanies = (companies: any[]): NormalizedCompanyAccount[] => {
  const list = Array.isArray(companies) ? companies : [];
  const unique = new Map<number, NormalizedCompanyAccount>();

  for (const company of list) {
    const id = Number(company?.company_id ?? company?.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    if (unique.has(id)) continue;

    unique.set(id, {
      id,
      company_name: company?.company_name || company?.name || `Company ${id}`,
      is_active:
        typeof company?.is_active === "boolean"
          ? company.is_active
          : undefined,
    });
  }

  return Array.from(unique.values());
};
