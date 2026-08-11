// src/components/subscription/subscriptionTypes.ts

export type PlanType = 'free' | 'pro' | 'premium';

export type BillingInterval = 'monthly' | 'yearly';

export interface Feature {
  id: number;
  name: string;
  iconName: string;
  description: string;
  plans: Record<PlanType, boolean>;
  /** Price per month for each plan */
  pricing: Record<PlanType, number>;
  /** Price per year for each plan (when paying yearly) */
  pricingYearly?: Record<PlanType, number>;
  /** Yearly discount percent per plan (e.g. 17) */
  yearlyDiscountPercent?: Record<PlanType, number>;
  badge: string | null;
  color: string;
}

export interface SelectedFeature extends Feature {
  plan: PlanType;
  /** Overrides PLAN_META label in checkout (e.g. Business Pro). */
  planBadgeLabel?: string;
  /** Platform `plans.slug` for create-payment-intent (e.g. trial); falls back to `plan` */
  iwCheckoutSlug?: string;
  /** Price for selected billing interval (monthly amount or yearly total) */
  price: number;
  billingInterval: BillingInterval;
}

export interface PlanMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  ring: string;
}

export const FEATURES: Feature[] = [
  {
    id: 1,
    name: 'CRM',
    iconName: 'Users',
    description: 'Customer relationship management, pipelines & contacts',
    plans: { free: false, pro: true, premium: true },
    pricing: { free: 0, pro: 12, premium: 29 },
    badge: 'Most Popular',
    color: '#0D9488',
  },
  {
    id: 2,
    name: 'WhatsApp Business',
    iconName: 'MessageSquare',
    description: 'Send & receive WhatsApp messages directly from your dashboard',
    plans: { free: true, pro: true, premium: true },
    pricing: { free: 0, pro: 8, premium: 18 },
    badge: null,
    color: '#25D366',
  },
  {
    id: 3,
    name: 'Invoicing',
    iconName: 'FileText',
    description: 'Create, send and track professional invoices & quotes',
    plans: { free: true, pro: true, premium: true },
    pricing: { free: 0, pro: 6, premium: 15 },
    badge: null,
    color: '#F59E0B',
  },
  {
    id: 4,
    name: 'Payments',
    iconName: 'CreditCard',
    description: 'Accept online payments via Stripe, card & bank transfer',
    plans: { free: false, pro: true, premium: true },
    pricing: { free: 0, pro: 10, premium: 22 },
    badge: null,
    color: '#0F766E',
  },

];

export const PLAN_META: Record<PlanType, PlanMeta> = {
  free: {
    label: 'Free',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.25)',
    dot: '#9CA3AF',
    ring: 'rgba(107,114,128,0.2)',
  },
  pro: {
    label: 'Pro',
    color: '#0D9488',
    bg: 'rgba(52,144,220,0.08)',
    border: 'rgba(52,144,220,0.35)',
    dot: '#0D9488',
    ring: 'rgba(52,144,220,0.22)',
  },
  premium: {
    label: 'Premium',
    color: '#115E59',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.35)',
    dot: '#115E59',
    ring: 'rgba(124,58,237,0.22)',
  },
};

export const PLAN_TYPES: PlanType[] = ['free', 'pro', 'premium'];