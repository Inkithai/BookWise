// types/pricing.ts
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  price: number | null;
  period: string;
  validity: string;
  badge?: string;
  features: Array<{ text: string; included: boolean }>;
  cta: string;
  highlighted: boolean;
  ctaAction: 'demo' | 'premium' | 'enterprise';
  /** Invoice API plan slug for subscribe */
  planSlug?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  currency?: string;
}

export interface BillingFormData {
  fullName: string;
  email: string;
  company: string;
  address: string;
  city: string;
  country: string;
}

export interface PaymentFormData {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}