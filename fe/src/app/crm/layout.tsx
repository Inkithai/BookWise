'use client';

import PlanFeatureGate from '@/components/plan/PlanFeatureGate';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanFeatureGate
      feature="crm"
      title="CRM requires Business Pro or higher"
      description="Custom CRM tables and lead tracking are included from Business Pro (£4.99) upward."
    >
      {children}
    </PlanFeatureGate>
  );
}
