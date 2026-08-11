// services/interface/subscription.ts
export interface SubscriptionPlan {
  id: string;
  name: 'Pro' | 'Enterprise';
  price: number | null;
  description: string;
  features: string[];
  billingCycle: 'monthly' | 'yearly' | 'custom';
}

export interface TrialUser {
  status: 'trial';
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
  trialDaysTotal: number;
}

export interface PaidUser {
  status: 'paid';
  plan: 'Pro' | 'Enterprise';
  startDate: string;
  nextBillingDate: string;
  renewalType: 'monthly' | 'yearly';
  autoRenew: boolean;
}

export interface ExpiredUser {
  status: 'expired';
  expiredDate: string;
  reason: 'trial_expired' | 'subscription_cancelled';
}

export type UserSubscription = TrialUser | PaidUser | ExpiredUser;

export interface SubscriptionResponse {
  success: boolean;
  data: UserSubscription;
  message?: string;
}

export interface ActivateSubscriptionPayload {
  planId: string;
  paymentMethodId?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export interface ActivateSubscriptionResponse {
  success: boolean;
  data: {
    subscription: PaidUser;
    nextBillingDate: string;
    amount: number;
  };
  message: string;
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
  description: string;
}

export interface BillingHistoryResponse {
  success: boolean;
  data: BillingHistory[];
}