import { http } from '@/services/service';

export interface SubscriptionFinanceHostRow {
  subscription_id: number;
  host_id: number | null;
  host_name: string;
  owner_user_id: number;
  owner_name: string | null;
  owner_email: string;
  owner_is_active: boolean;
  companies: string[];
  subscription_status: string;
  plan_type: string | null;
  plan_name: string;
  amount: number;
  paid_in_period: number;
  subscription_started_at: string | null;
  paid_at: string | null;
  next_payment_at: string | null;
  trial_ends_at: string | null;
  payment_intent_id: string | null;
  has_stripe_customer: boolean;
  is_super_admin?: boolean;
}

export interface PlanSubscriptionSection {
  plan_id: number;
  slug: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  is_free: boolean;
  subscriber_count: number;
  host_count: number;
  revenue_in_period: number;
  payment_count: number;
  hosts: SubscriptionFinanceHostRow[];
}

export interface SubscriptionFinanceTransaction {
  id: number;
  paid_at: string | null;
  amount: number;
  plan_slug: string | null;
  plan_name: string;
  plan_type: string | null;
  status: string;
  payment_intent_id: string | null;
  owner_user_id: number;
  owner_name: string | null;
  owner_email: string;
  host_ids: number[];
  host_names: string[];
  is_super_admin?: boolean;
}

export interface SubscriptionFinanceSummary {
  total_revenue: number;
  total_hosts: number;
  total_subscribers: number;
  transaction_count: number;
  active_subscribers: number;
  trialing_subscribers: number;
  past_due_subscribers: number;
}

export interface SubscriptionFinanceOverview {
  currency: string;
  period: {
    month: string;
    month_label: string;
    start_date: string;
    end_date: string;
  };
  summary: SubscriptionFinanceSummary;
  plans: PlanSubscriptionSection[];
  transactions: SubscriptionFinanceTransaction[];
}

export async function getSubscriptionFinanceOverview(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<SubscriptionFinanceOverview> {
  const { data } = await http.get<{ success: boolean; data: SubscriptionFinanceOverview }>(
    'super-admin/analytics/subscription-finance',
    { params },
  );
  return data.data;
}
