'use client';

import PlanUpgradeCheckoutModal from './PlanUpgradeCheckoutModal';
import type { BillingInterval } from '@/lib/Subscriptiontypes';

interface InvoicePlanStripeModalProps {
  invoiceFeatureId: number;
  planSlug: string;
  iwCheckoutSlug: string;
  planLabel: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingInterval: BillingInterval;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoicePlanStripeModal({
  invoiceFeatureId,
  iwCheckoutSlug,
  planLabel,
  monthlyPrice,
  yearlyPrice,
  billingInterval,
  onClose,
  onSuccess,
}: InvoicePlanStripeModalProps) {
  const price = billingInterval === 'yearly' ? yearlyPrice : monthlyPrice;

  return (
    <PlanUpgradeCheckoutModal
      invoiceFeatureId={invoiceFeatureId}
      iwCheckoutSlug={iwCheckoutSlug}
      planLabel={planLabel}
      price={price}
      billingInterval={billingInterval}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
