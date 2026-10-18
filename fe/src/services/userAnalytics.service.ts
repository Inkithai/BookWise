/**
 * userAnalytics.service.ts
 *
 * All API calls for the Super Admin Analytics dashboard.
 * Wired to the new SuperAdminAnalytics module endpoints: api/analytics/...
 *
 * HOW TO USE:
 *   - Drop this file into  src/services/userAnalytics.service.ts
 *   - Set NEXT_PUBLIC_API_URL in your .env  (e.g. http://localhost:8000)
 *   - The `http` export at the bottom is an alias so AnalyticsUserForm.tsx
 *     can call  http.get('admin/roles')  without modification.
 */

import axios, { type AxiosInstance } from 'axios';

// ─── Axios instance ───────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
  headers: { Accept: 'application/json' },
});

// Token Management Helpers
const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    if (!decoded.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime + 30;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return true;
  }
};

// Attach stored Bearer token to every request
api.interceptors.request.use((config) => {
  const tokenStorageKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || "authToken";
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenStorageKey) : null;

  if (token) {
    if (isTokenExpired(token)) {
      console.warn('Token expired, logging out...');
      handleTokenExpiration();
      return Promise.reject(new Error('Token expired'));
    }

    config.headers["Authorization"] = `Bearer ${token}`;
    config.headers["Accept"] = "application/json";
  }
  return config;
});
const handleTokenExpiration = () => {
  if (typeof window !== 'undefined') {
    const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
    const userKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser';
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);

    window.dispatchEvent(new CustomEvent('token-expired'));

    window.location.href = '/auth/login';
  }
};
// Unwrap axios response envelope
function unwrap<T>(res: { data: T }): T {
  return res.data;
}

// ═════════════════════════════════════════════════════════════════════════════
// Shared
// ═════════════════════════════════════════════════════════════════════════════

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD  ·  GET api/analytics/dashboard
// ═════════════════════════════════════════════════════════════════════════════

export interface DashboardOverview {
  total_users: number;
  total_invoices: number;
  total_clients: number;
  sub_users: number;
  avg_invoices_per_user: number;
  admin_users: number;
}

export interface UserInvoiceStat {
  userId: string;
  userName: string;
  invoiceCount: number;
  totalAmount: number;
}

export interface UserClientStat {
  userId: string;
  userName: string;
  clientCount: number;
  activeCount: number;
  inactiveCount: number;
}

export interface SubUserDistributionItem {
  userId: string;
  userName: string;
  subUserCount: number;
}

export interface MonthlyDataPoint {
  month: string; // "YYYY-MM"
  invoices: number;
  clients: number;
  users: number;
  subUsers: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  user_invoice_stats: UserInvoiceStat[];
  user_client_stats: UserClientStat[];
  sub_user_distribution: SubUserDistributionItem[];
  monthly_timeseries: MonthlyDataPoint[];
}

export async function getDashboardData(): Promise<DashboardData> {
  return unwrap(await api.get<DashboardData>('api/analytics/dashboard'));
}

/**
 * Backward-compatible helper used by AnalyticsDashboard.
 * Current backend endpoint is already role-aware via auth context.
 */
export async function getRoleAwareDashboard(_user?: unknown): Promise<DashboardData> {
  return getDashboardData();
}

// ═════════════════════════════════════════════════════════════════════════════
// USERS  ·  GET api/analytics/users
// ═════════════════════════════════════════════════════════════════════════════

export interface SubUserItem {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface AnalyticsUser {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  user_name: string;
  is_active: boolean;
  account_type: string | null;
  company_id: number | null;
  profile_img: string | null;
  created_at: string;
  sub_user_count: number;
  sub_users: SubUserItem[];
}

export interface AnalyticsUserSummary {
  total: number;
  active: number;
  inactive: number;
  sub_users: number;
  admin_users: number;
  // Super-admin only aggregate metric (optional backend field)
  total_companies?: number;
}

export interface AnalyticsUsersResponse {
  data: AnalyticsUser[];
  summary: AnalyticsUserSummary;
  pagination: Pagination;
}

export interface GetUsersParams {
  search?: string;
  status?: string;
  account_type?: string;
  page?: number;
  per_page?: number;
}

export async function getAnalyticsUsers(
  params: GetUsersParams = {}
): Promise<AnalyticsUsersResponse> {
  return unwrap(
    await api.get<AnalyticsUsersResponse>('api/analytics/users', { params })
  );
}

// ─── GET api/analytics/users/{id} ────────────────────────────────────────────

export interface AnalyticsUserDetail {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  phone: string | null;
  user_name: string;
  is_active: number | string;
  is_active_label: string;
  is_otp_verified: number | string | boolean;
  is_otp_verified_label: string;
  account_type: string | null;
  profile_img: string | null;
  location: string | null;
  short_bio: string | null;
  company_designation: string | null;
  company_id: number | null;
  team?: string;
  team_id?: number | null;
  company_name: string | null;
  company: { company_name: string } | null;
  plan: {
    id: number;
    name: string;
    formatted_price: string | null;
    currency: string | null;
  } | null;
  roles: Array<{ id: number; name: string }>;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAnalyticsUserById(
  userId: number
): Promise<AnalyticsUserDetail> {
  return unwrap(
    await api.get<AnalyticsUserDetail>(`api/analytics/users/${userId}`)
  );
}

// Alias used by AnalyticsUserDetailView.tsx
export async function getUserById(
  userId: number
): Promise<AnalyticsUserDetail> {
  return getAnalyticsUserById(userId);
}

// ─── GET api/analytics/users/dropdown ────────────────────────────────────────

export interface UserDropdownItem {
  userId: string;
  userName: string;
}

export async function getUsersList(): Promise<UserDropdownItem[]> {
  return unwrap(
    await api.get<UserDropdownItem[]>('api/analytics/users/dropdown')
  );
}

// ─── PUT api/analytics/users/{id}/activate ───────────────────────────────────

export async function activateUser(userId: number): Promise<void> {
  await api.put(`api/analytics/users/${userId}/activate`);
}

// ─── PUT api/analytics/users/{id}/deactivate ─────────────────────────────────

export async function deactivateUser(userId: number): Promise<void> {
  await api.put(`api/analytics/users/${userId}/deactivate`);
}

// ─── DELETE api/analytics/users/{id} ─────────────────────────────────────────

export async function deleteUser(
  userId: number,
  _action?: string     // extra param accepted but ignored — keeps call sites unchanged
): Promise<void> {
  await api.delete(`api/analytics/users/${userId}`);
}

// ─── POST api/analytics/users ────────────────────────────────────────────────

export interface CreateAdminUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  user_name: string;
  phone_number?: string | null;
  active: 0 | 1;
  roles: number;
}

export async function createUser(
  payload: CreateAdminUserPayload
): Promise<{ id: number; message: string }> {
  return unwrap(
    await api.post<{ id: number; message: string }>('api/analytics/users', payload)
  );
}

// ─── PUT api/analytics/users/{id} ────────────────────────────────────────────

export interface UpdateAdminUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  user_name?: string;
  phone_number?: string | null;
  active?: 0 | 1;
  roles?: number;
  location?: string | null;
  short_bio?: string | null;
  company_designation?: string | null;
  profile_img?: File;
}

export async function updateUser(
  userId: number,
  payload: UpdateAdminUserPayload
): Promise<void> {
  if (payload.profile_img instanceof File) {
    // Laravel requires _method spoofing for PUT with multipart
    const form = new FormData();
    form.append('_method', 'PUT');
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        form.append(k, v as string | Blob);
      }
    });
    await api.post(`api/analytics/users/${userId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    await api.put(`api/analytics/users/${userId}`, payload);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENTS  ·  GET api/analytics/clients
// ═════════════════════════════════════════════════════════════════════════════

export interface AnalyticsClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive';
  user_id: string;
  userId: string;   // alias — same value as user_id, returned by API
  userName: string;
  totalInvoices: number;
}

export interface ClientSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface AnalyticsClientsResponse {
  clients: AnalyticsClient[];
  summary: ClientSummary;
  user_distribution: UserClientStat[];
  pagination: Pagination;
}

export interface GetClientsParams {
  search?: string;
  status?: string;
  user_id?: string;
  page?: number;
  per_page?: number;
}

export async function getAnalyticsClients(
  params: GetClientsParams = {}
): Promise<AnalyticsClientsResponse> {
  return unwrap(
    await api.get<AnalyticsClientsResponse>('api/analytics/clients', { params })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INVOICES  ·  GET api/analytics/invoices
// ═════════════════════════════════════════════════════════════════════════════

export interface AnalyticsInvoice {
  id: number;
  number: string;
  client: string;
  status: string;
  date: string;
  dueDate: string;
  userId: string;
  userName: string;
}

export interface InvoiceUserStat {
  userId: string;
  userName: string;
  invoiceCount: number;
  statuses: Record<string, number>;
  monthlyDistribution: Record<string, number>;
}

export interface AnalyticsInvoicesResponse {
  invoices: AnalyticsInvoice[];
  status_counts: Record<string, number>;
  status_breakdown: Record<string, number>;
  user_stats: InvoiceUserStat[];
  pagination: Pagination;
}

export interface GetInvoicesParams {
  search?: string;
  status?: string;
  user_id?: string;
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: 'date' | 'due_date' | 'status' | 'client' | 'number';
  sort_dir?: 'asc' | 'desc';
}

export async function getAnalyticsInvoices(
  params: GetInvoicesParams = {}
): Promise<AnalyticsInvoicesResponse> {
  return unwrap(
    await api.get<AnalyticsInvoicesResponse>('api/analytics/invoices', { params })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGS  ·  GET api/analytics/activity-logs
// ═════════════════════════════════════════════════════════════════════════════

export interface ActivityLogItem {
  id: number;
  user_id: number;
  user_name: string;
  account_type: string;
  type: string;
  status: string;
  action: string;
  details: string;
  error: string | null;
  ip_address: string | null;
  request_data: string | null;
  time_ago: string;
}

export interface ActivityLogSummary {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

export interface ActivityLogsResponse {
  data: ActivityLogItem[];
  summary: ActivityLogSummary;
  pagination: Pagination;
}

export interface GetActivityLogsParams {
  search?: string;
  type?: string;
  status?: string;
  account_type?: string;
  page?: number;
  per_page?: number;
}

export async function getActivityLogs(
  params: GetActivityLogsParams = {}
): Promise<ActivityLogsResponse> {
  return unwrap(
    await api.get<ActivityLogsResponse>('api/analytics/activity-logs', { params })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers used directly by component files
// ═════════════════════════════════════════════════════════════════════════════

/** Image file validation — used by AnalyticsUserForm.tsx */
export function validateImageFile(
  file: File
): { valid: boolean; error?: string } {
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    return { valid: false, error: 'Only JPEG and PNG files are allowed.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, error: 'File size must be under 2 MB.' };
  }
  return { valid: true };
}

/**
 * `http` object  — AnalyticsUserForm.tsx calls  http.get('admin/roles')
 * to fetch the roles dropdown.  We proxy through the same axios instance
 * so auth headers are automatically included.
 */
export const http = {
  get: <T = unknown>(url: string, config?: object) =>
    api.get<T>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.post<T>(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.put<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: object) =>
    api.delete<T>(url, config),
};