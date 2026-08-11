import axios from "axios";
import https from "https";
import { resolveCheckoutSlug } from "@/lib/plan-map";

const iwHttp = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_BOOKWISE_API_URL || "http://127.0.0.1:8000"}/api/v1/`,
    timeout: 30_000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

function getCallerEmail(): string {
    if (typeof window === "undefined") return "";
    try {
        const userKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "authUser";
        const raw = localStorage.getItem(userKey);
        if (!raw) return "";
        const parsed = JSON.parse(raw);
        return parsed?.email || parsed?.data?.email || "";
    } catch {
        return "";
    }
}

export interface PlanItem {
    id: number;
    name: string;
    slug: string;
    is_trial: boolean;
    is_vip?: boolean;
    is_active?: boolean;
    trial_days: number | null;
    sort_order: number;
    amount_monthly: number | null;
    amount_yearly: number | null;
    yearly_discount_percent: number | null;
}

export interface ApiFeature {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    feature_group_id?: number | null;
    subscription_type?: 'free' | 'paid' | 'trial';
    status?: 'active' | 'inactive';
    fees?: number | string;
    is_popular?: boolean;
    free_trial_time?: number;
    logo_url?: string;
}

export interface TeamFeatureItem {
    id: number;
    team_id: number;
    feature_id: number;
    status?: string;
    subscription_type?: string;
    payment_status?: string;
    activated_at?: string;
    cancelled_at?: string;
    trial_ends_at?: string;
    plan_id?: number | null;
    plan?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    feature?: ApiFeature;
}

export interface PaymentHistoryItem {
    id: number;
    amount: number;
    currency: string;
    status: string;
    paid_at: string | null;
    items_count: number;
    items?: Array<{
        feature_name: string;
        plan_slug: string;
        plan_name: string;
    }>;
}

export interface InvoiceItem {
    id: number;
    invoice_number: string;
    amount_cents: number;
    amount: number;
    billing_interval: string | null;
    status: string;
    paid_at: string | null;
}

function buildHeaders(): Record<string, string> {
    const email = getCallerEmail();
    const apiKey = process.env.NEXT_PUBLIC_BOOKWISE_APP_API_KEY || "9f7cA8xK2LmPqR5vT1zYbN4wH6eJdU3sC0oGkX9aFQ2rV7mP8tZ";
    return {
        "api-key": apiKey,
        "email": email,
        "Accept": "application/json",
    };
}

// Features API
export const getFeatures = async (params?: any): Promise<any[]> => {
    try {
        const response = await iwHttp.get('features', { params, headers: buildHeaders() });
        const resData = response.data?.data || response.data;
        if (resData && Array.isArray(resData.data) && typeof resData.current_page !== 'undefined') {
            return resData.data;
        }
        return Array.isArray(resData) ? resData : (resData?.data || []);
    } catch (error) {
        console.error('fetch features failed', error);
        return [];
    }
};

export const getTeamFeatures = async (params?: any): Promise<any[]> => {
    try {
        const response = await iwHttp.get('team-features', { params, headers: buildHeaders() });
        const data = response.data?.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('fetch team features failed', error);
        return [];
    }
};

export const cancelTeamFeature = async (teamFeatureId: number): Promise<void> => {
    await iwHttp.delete(`team-features/${teamFeatureId}`, { headers: buildHeaders() });
};

export const reactivateTeamFeature = async (teamFeatureId: number): Promise<any> => {
    const response = await iwHttp.patch(`team-features/${teamFeatureId}/reactivate`, {}, { headers: buildHeaders() });
    return response.data?.data ?? response.data;
};

// Plans API
export const getPlans = async (options?: { includeHidden?: boolean }): Promise<any[]> => {
    const res = await iwHttp.get(`plans`, {
        headers: buildHeaders(),
        params: options?.includeHidden ? { public_only: 0 } : undefined,
    });
    const data = res.data;
    if (data?.success && data?.data) return data.data;
    if (Array.isArray(data?.data)) return data.data;
    throw new Error(data?.message || 'Failed to load plans');
};

export interface ReferralCommissionBalance {
    balance: number;
    canApply: boolean;
    currency: string;
}

export interface CommissionWithdrawalHistoryItem {
    id: number;
    amount: number;
    amount_cents: number;
    currency: string;
    method: string;
    method_label: string;
    status: string;
    status_label: string;
    reference_number?: string | null;
    notes?: string | null;
    created_at?: string | null;
}

export interface CommissionTransactionItem {
    id: number;
    type: string;
    amount: number;
    amount_cents: number;
    currency: string;
    description?: string | null;
    reference_id?: number | null;
    created_at?: string | null;
}

export interface CommissionWalletSummary {
    available_balance?: number;
    pending_withdrawal?: number;
    total_withdrawn?: number;
    total_earned?: number;
    currency?: string;
}

export interface CommissionHistoryPayload {
    can_apply: boolean;
    wallet: CommissionWalletSummary | null;
    withdrawals: CommissionWithdrawalHistoryItem[];
    transactions: CommissionTransactionItem[];
}

export const getCommissionWithdrawalHistory = async (limit = 25): Promise<CommissionHistoryPayload> => {
    try {
        const res = await iwHttp.get<{ success: boolean; data?: CommissionHistoryPayload }>(
            'subscription/commission-history',
            { headers: buildHeaders(), params: { limit } },
        );
        return (
            res.data?.data ?? {
                can_apply: false,
                wallet: null,
                withdrawals: [],
                transactions: [],
            }
        );
    } catch {
        return { can_apply: false, wallet: null, withdrawals: [], transactions: [] };
    }
};

export const getReferralCommissionBalance = async (): Promise<ReferralCommissionBalance> => {
    try {
        const res = await iwHttp.get<{
            success: boolean;
            data?: {
                available_balance?: number;
                can_apply?: boolean;
                currency?: string;
            };
        }>('subscription/commission-balance', { headers: buildHeaders() });
        return {
            balance: Number(res.data?.data?.available_balance ?? 0),
            canApply: res.data?.data?.can_apply === true,
            currency: res.data?.data?.currency ?? 'LKR',
        };
    } catch {
        return { balance: 0, canApply: false, currency: 'LKR' };
    }
};

export const createSubscriptionPaymentIntent = async (
    items: any[],
    options?: { commission_cents?: number; use_commission_balance?: boolean },
): Promise<any> => {
    const plans = await getPlans();
    const availableSlugs = plans.map((p) => String(p.slug ?? ''));
    const normalizedItems = items.map((item) => ({
        ...item,
        plan_slug: resolveCheckoutSlug(String(item.plan_slug ?? 'free'), availableSlugs),
    }));
    const body: Record<string, unknown> = { items: normalizedItems };
    if (options?.commission_cents != null) body.commission_cents = options.commission_cents;
    if (options?.use_commission_balance) body.use_commission_balance = true;

    const res = await iwHttp.post(
        `subscription/create-payment-intent`,
        body,
        { headers: buildHeaders() },
    );
    const data = res.data;
    if (data?.success && data?.data) return data.data;
    throw new Error(data?.message || 'Failed to create payment intent');
};

export const confirmSubscriptionPayment = async (checkoutId: number): Promise<void> => {
    const res = await iwHttp.post(`subscription/confirm-payment`, { checkout_id: checkoutId }, { headers: buildHeaders() });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to confirm payment');
};

export const getPaymentHistory = async (params?: any): Promise<any> => {
    const res = await iwHttp.get(`subscription/payment-history`, { params, headers: buildHeaders() });
    const data = res.data;
    if (data?.success) return { success: true, data: data.data ?? [], meta: data.meta ?? {} };
    throw new Error(data?.message || 'Failed to load payment history');
};

export const getInvoices = async (params?: any): Promise<any> => {
    const res = await iwHttp.get(`subscription/invoices`, { params, headers: buildHeaders() });
    const data = res.data;
    if (data?.success) return { success: true, data: data.data ?? [], meta: data.meta ?? {} };
    throw new Error(data?.message || 'Failed to load invoices');
};

// Refund Requests
export interface RefundRequestPayload {
    team_feature_id: number;
    reason?: string;
    cancel_subscription?: boolean;
}

export const createRefundRequest = async (data: RefundRequestPayload): Promise<{
    success: boolean;
    message?: string;
    data?: unknown;
}> => {
    const response = await iwHttp.post(`refund-requests`, data, { headers: buildHeaders() });
    const body = response.data;
    if (body?.success === false) {
        throw new Error(body?.message || 'Failed to submit refund request');
    }
    return body;
};

export const getRefundRequests = async (params?: {
    status?: string;
    per_page?: number;
    page?: number;
}): Promise<{ success: boolean; data: Array<{ team_feature_id?: number }>; meta?: unknown }> => {
    const response = await iwHttp.get(`refund-requests`, { params, headers: buildHeaders() });
    return response.data;
};
