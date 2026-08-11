/**
 * referral.service.ts
 *
 * Referral data is proxied via /api/sync/referral/* (Next.js → BookWise).
 */

import { getInvoiceReferralScopeFromStorage } from "@/lib/invoice-referral-scope";
import { getInvoiceUserEmail } from "@/lib/invoice-user-email";

function fileToBase64(
  file: File
): Promise<{ name: string; type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const data = result.includes(",") ? result.split(",")[1]! : result;
      resolve({
        name: file.name || "share-image.png",
        type: file.type || "image/png",
        data,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

async function iwReferralFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const email = getInvoiceUserEmail();
  if (!email) {
    throw new Error("You must be logged in to Invoice to load referral data.");
  }

  const { params, ...fetchInit } = init || {};
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        search.set(key, String(value));
      }
    }
  }

  const qs = search.toString();
  const url = `/api/sync/referral/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`;

  const headers = new Headers(fetchInit.headers);
  headers.set("x-invoice-user-email", email);
  headers.set("x-invoice-referral-scope", getInvoiceReferralScopeFromStorage());
  if (!(fetchInit.body instanceof FormData)) {
    headers.set("Accept", "application/json");
    if (fetchInit.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const controller = new AbortController();
  const isMultipartUpload = fetchInit.body instanceof FormData;
  const bodyStr = typeof fetchInit.body === "string" ? fetchInit.body : "";
  const isShareSettingsUpload =
    path.includes("share-settings") && bodyStr.includes('"images"');
  const timeoutMs = isMultipartUpload || isShareSettingsUpload ? 180000 : 30000;
  const timeout = setTimeout(() => controller.abort("request-timeout"), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...fetchInit, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        isMultipartUpload
          ? "Image upload timed out. Please try a smaller image or retry."
          : "Request timed out. Please retry."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { message?: string })?.message ||
      `BookWise referral request failed (${res.status}).`;
    throw new Error(message);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferralStats {
  total_referrals: number;
  in_trial: number;
  trial_ended: number;
  total_earned_cents: number;
  total_earned: number;
  pending_cents: number;
  pending: number;
  currency: string;
}

export interface ReferralCode {
  id: number;
  user_id: number;
  team_id: number | null;
  code: string;
  referral_link: string;
  total_referrals: number;
  use_count: number;
  max_uses: number | null;
  created_at: string;
  updated_at: string;
  user: { id: number; first_name: string; last_name: string; email: string } | null;
  team: { id: number; name: string } | null;
}

export interface ReferralRecord {
  id: number;
  referral_code: string;
  plan_type: string;
  registered_at: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
  team_id: number | null;
  referral_code_owner_id: number;
  referred_user_id: number;
  code_owner: { id: number; full_name: string; email: string } | null;
  referred_user: { id: number; full_name: string; email: string; team_id: number | null } | null;
  team: { id: number; name: string } | null;
}

export interface ReferralEarningItem {
  id: number;
  amount_cents: number;
  amount: number;
  currency: string;
  paid_at: string | null;
  status: string;
  referred_user: { id: number; full_name: string; email: string } | null;
  referral?: { referral_code: string; registered_at: string | null; trial_ends_at: string | null };
}

export interface ReferralWalletSummary {
  total_earned_cents: number;
  total_earned: number;
  available_balance_cents: number;
  available_balance: number;
  pending_withdrawal_cents: number;
  pending_withdrawal: number;
  total_withdrawn_cents: number;
  total_withdrawn: number;
  currency: string;
}

export interface WithdrawalMethodOption {
  value: string;
  label: string;
  minimum_cents: number;
  minimum: number;
}

export interface ReferralWithdrawalRequestItem {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  company_name?: string | null;
  amount_cents: number;
  amount: number;
  currency: string;
  method: string;
  method_label: string;
  status: string;
  status_label: string;
  notes?: string | null;
  reference_number?: string | null;
  payment_date?: string | null;
  evidence_url?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  bank_details?: {
    account_holder_name: string;
    bank_name: string;
    branch_name?: string | null;
    account_number: string;
    swift_code?: string | null;
    country: string;
    currency: string;
  };
  paypal_details?: { paypal_email: string };
  stripe_details?: { stripe_email: string; stripe_account_id?: string | null };
  audit_log?: Array<{
    id: number;
    action: string;
    from_status?: string | null;
    to_status?: string | null;
    notes?: string | null;
    actor?: string | null;
    created_at?: string;
  }>;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedWithdrawalRequests {
  items: ReferralWithdrawalRequestItem[];
  meta: PaginatedMeta;
}

export interface ReferralWithdrawalNotificationItem {
  id: string;
  read_at: string | null;
  created_at: string | null;
  data: {
    type: string;
    event: string;
    subject: string;
    withdrawal_request_id: number;
    amount: number;
    currency: string;
    method_label: string;
    status_label: string;
    reference_number?: string | null;
    evidence_url?: string | null;
  };
}

export interface ReferralDashboardData {
  stats: ReferralStats;
  wallet?: ReferralWalletSummary | null;
  my_code: ReferralCode | null;
  recent_referrals: ReferralRecord[];
  recent_earnings: ReferralEarningItem[];
  /** Present when the logged-in user signed up via someone else's referral code */
  my_referral?: ReferralRecord | null;
  your_commission_rate?: number | null;
  commission_rate_is_custom?: boolean;
}

export interface AdminStatsData {
  total_referrals: number;
  in_trial: number;
  trial_ended: number;
  total_earned_cents: number;
  total_earned: number;
  referrers_count: number;
  currency: string;
}

export interface CommissionByMonth {
  month: string;
  commissions: number;
}

export interface TopReferrer {
  rank: number;
  name: string;
  referrals: number;
}

export interface AdminDashboardData {
  stats: AdminStatsData;
  commissions_by_month: CommissionByMonth[];
  top_referrers: TopReferrer[];
  your_commission_rate: number | null;
  commission_rate_is_custom: boolean;
}

export interface ReferralShareSettings {
  share_title: string;
  share_body: string;
  image_url?: string | null;
  image_urls?: string[];
}

export interface TeamCommissionRate {
  id: number;
  company: string;
  owner: { id: number; full_name: string; email: string } | null;
  total_referrals: number;
  rate: number;
  is_custom: boolean;
}

function defaultStats(): ReferralStats {
  return {
    total_referrals: 0,
    in_trial: 0,
    trial_ended: 0,
    total_earned_cents: 0,
    total_earned: 0,
    pending_cents: 0,
    pending: 0,
    currency: "LKR",
  };
}

// ---------------------------------------------------------------------------
// API calls (via Next.js proxy → BookWise)
// ---------------------------------------------------------------------------

export const getReferralDashboard = async (): Promise<ReferralDashboardData> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralDashboardData }>(
    "admin/referrals/dashboard"
  );
  return (
    res.data ?? {
      stats: defaultStats(),
      my_code: null,
      recent_referrals: [],
      recent_earnings: [],
    }
  );
};

function extractReferralRecords(payload: {
  data?: ReferralRecord[] | { data?: ReferralRecord[] };
}): ReferralRecord[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export const getReferrals = async (params?: {
  plan_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<ReferralRecord[]> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralRecord[] | { data?: ReferralRecord[] };
  }>("admin/referrals", { params });
  return extractReferralRecords(res);
};

export const getReferralEarnings = async (params?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  scope?: "own" | "team";
}): Promise<ReferralEarningItem[]> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralEarningItem[] }>(
    "admin/referrals/earnings",
    { params }
  );
  return Array.isArray(res.data) ? res.data : [];
};

export const getAdminStats = async (): Promise<AdminStatsData | null> => {
  try {
    const res = await iwReferralFetch<{ success: boolean; data: AdminStatsData }>(
      "admin/referrals/admin-stats"
    );
    return res.data ?? null;
  } catch {
    return null;
  }
};

export const getAdminReferralDashboard = async (): Promise<AdminDashboardData | null> => {
  try {
    const res = await iwReferralFetch<{ success: boolean; data: AdminDashboardData }>(
      "admin/referrals/admin-dashboard"
    );
    return res.data ?? null;
  } catch {
    return null;
  }
};

export const generateReferralCode = async (): Promise<ReferralCode> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralCode; message?: string }>(
    "admin/referrals/codes/generate",
    { method: "POST", body: JSON.stringify({}) }
  );
  if (!res.data) throw new Error(res.message || "Failed to generate code");
  return res.data;
};

export const updateReferralCode = async (
  id: number,
  code?: string,
  maxUses?: number | null
): Promise<ReferralCode> => {
  const payload: Record<string, unknown> = {};
  if (code != null) payload.code = code;
  if (maxUses !== undefined) payload.max_uses = maxUses;

  try {
    const res = await iwReferralFetch<{ success: boolean; data: ReferralCode; message?: string }>(
      `admin/referrals/codes/${id}`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    if (!res.data) throw new Error(res.message || "Failed to update code");
    return res.data;
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(err.message || "Failed to update code");
  }
};

export const getReferralShareSettings = async (): Promise<ReferralShareSettings> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralShareSettings }>(
    "admin/referrals/share-settings"
  );
  return res.data ?? { share_title: "", share_body: "", image_url: null, image_urls: [] };
};

export const updateReferralShareSettings = async (payload: {
  share_title?: string;
  share_body?: string;
  images?: File[];
  remove_images?: boolean;
  remove_image_urls?: string[];
}): Promise<ReferralShareSettings> => {
  const body: Record<string, unknown> = {};
  if (payload.share_title !== undefined) body.share_title = payload.share_title;
  if (payload.share_body !== undefined) body.share_body = payload.share_body;
  if (payload.remove_images) body.remove_images = 1;
  if (payload.remove_image_urls?.length) body.remove_image_urls = payload.remove_image_urls;
  if (payload.images?.length) {
    body.images = await Promise.all(payload.images.map(fileToBase64));
  }

  const res = await iwReferralFetch<{ success: boolean; data: ReferralShareSettings; message?: string }>(
    "admin/referrals/share-settings",
    { method: "POST", body: JSON.stringify(body) }
  );

  if (!res.data) {
    throw new Error(res.message || "Failed to update share settings");
  }
  return res.data;
};

export const listTeamCommissionRates = async (): Promise<TeamCommissionRate[]> => {
  try {
    const res = await iwReferralFetch<{ success: boolean; data: TeamCommissionRate[] }>(
      "admin/referrals/commission/teams"
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
};

export const getGlobalCommissionRate = async (): Promise<number | null> => {
  try {
    const res = await iwReferralFetch<{ success: boolean; data: { commission_rate: number } }>(
      "admin/referrals/commission/global"
    );
    const rate = res.data?.commission_rate;
    return typeof rate === "number" ? rate : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

export const getReferralWallet = async (): Promise<ReferralWalletSummary> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralWalletSummary }>(
    "admin/referrals/withdrawals/wallet"
  );
  return (
    res.data ?? {
      total_earned_cents: 0,
      total_earned: 0,
      available_balance_cents: 0,
      available_balance: 0,
      pending_withdrawal_cents: 0,
      pending_withdrawal: 0,
      total_withdrawn_cents: 0,
      total_withdrawn: 0,
      currency: "LKR",
    }
  );
};

export const getWithdrawalMethods = async (): Promise<WithdrawalMethodOption[]> => {
  const res = await iwReferralFetch<{ success: boolean; data: WithdrawalMethodOption[] }>(
    "admin/referrals/withdrawals/methods"
  );
  return Array.isArray(res.data) ? res.data : [];
};

const defaultPagination = (items: ReferralWithdrawalRequestItem[]): PaginatedMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: items.length || 20,
  total: items.length,
});

export const listWithdrawalRequests = async (params?: {
  per_page?: number;
  page?: number;
}): Promise<PaginatedWithdrawalRequests> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem[];
    meta?: PaginatedMeta;
  }>("admin/referrals/withdrawals", { params });
  const items = Array.isArray(res.data) ? res.data : [];
  return { items, meta: res.meta ?? defaultPagination(items) };
};

export const getWithdrawalRequest = async (id: number): Promise<ReferralWithdrawalRequestItem> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralWithdrawalRequestItem }>(
    `admin/referrals/withdrawals/${id}`
  );
  if (!res.data) throw new Error("Withdrawal request not found.");
  return res.data;
};

export const createWithdrawalRequest = async (
  payload: Record<string, unknown>
): Promise<ReferralWithdrawalRequestItem> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem;
    message?: string;
  }>("admin/referrals/withdrawals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) throw new Error(res.message || "Failed to submit withdrawal request.");
  return res.data;
};

export const cancelWithdrawalRequest = async (id: number): Promise<ReferralWithdrawalRequestItem> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem;
    message?: string;
  }>(`admin/referrals/withdrawals/${id}/cancel`, { method: "POST", body: JSON.stringify({}) });
  if (!res.data) throw new Error(res.message || "Failed to cancel withdrawal.");
  return res.data;
};

export const listAdminWithdrawalRequests = async (params?: {
  status?: string;
  method?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<PaginatedWithdrawalRequests> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem[];
    meta?: PaginatedMeta;
  }>("admin/referrals/withdrawals-admin", { params });
  const items = Array.isArray(res.data) ? res.data : [];
  return { items, meta: res.meta ?? defaultPagination(items) };
};

export const canManageWithdrawals = async (): Promise<boolean> => {
  try {
    const res = await iwReferralFetch<{ success: boolean; data: { can_manage: boolean } }>(
      "admin/referrals/withdrawals-admin/access"
    );
    return res.data?.can_manage === true;
  } catch {
    return false;
  }
};

export const getWithdrawalNotifications = async (): Promise<{
  items: ReferralWithdrawalNotificationItem[];
  unread_count: number;
}> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalNotificationItem[];
    meta?: { unread_count: number };
  }>("admin/referrals/withdrawals/notifications");
  return {
    items: Array.isArray(res.data) ? res.data : [],
    unread_count: res.meta?.unread_count ?? 0,
  };
};

export const markWithdrawalNotificationRead = async (id: string): Promise<void> => {
  await iwReferralFetch(`admin/referrals/withdrawals/notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const markAllWithdrawalNotificationsRead = async (): Promise<void> => {
  await iwReferralFetch("admin/referrals/withdrawals/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const getAdminWithdrawalRequest = async (id: number): Promise<ReferralWithdrawalRequestItem> => {
  const res = await iwReferralFetch<{ success: boolean; data: ReferralWithdrawalRequestItem }>(
    `admin/referrals/withdrawals-admin/${id}`
  );
  if (!res.data) throw new Error("Withdrawal request not found.");
  return res.data;
};

export const updateAdminWithdrawalStatus = async (
  id: number,
  payload: { status: string; admin_notes?: string }
): Promise<ReferralWithdrawalRequestItem> => {
  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem;
    message?: string;
  }>(`admin/referrals/withdrawals-admin/${id}/status`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) throw new Error(res.message || "Failed to update status.");
  return res.data;
};

export const completeAdminWithdrawal = async (
  id: number,
  payload: { reference_number: string; payment_date: string; admin_notes?: string; evidence: File }
): Promise<ReferralWithdrawalRequestItem> => {
  const form = new FormData();
  form.append("reference_number", payload.reference_number);
  form.append("payment_date", payload.payment_date);
  if (payload.admin_notes) form.append("admin_notes", payload.admin_notes);
  form.append("evidence", payload.evidence);

  const res = await iwReferralFetch<{
    success: boolean;
    data: ReferralWithdrawalRequestItem;
    message?: string;
  }>(`admin/referrals/withdrawals-admin/${id}/complete`, {
    method: "POST",
    body: form,
  });
  if (!res.data) throw new Error(res.message || "Failed to complete withdrawal.");
  return res.data;
};
