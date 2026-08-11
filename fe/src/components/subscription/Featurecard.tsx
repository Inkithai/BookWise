// src/components/subscription/FeatureCard.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Feature, PlanType, PLAN_META, PLAN_TYPES, type BillingInterval } from '../../lib/Subscriptiontypes';
import SubscriptionIcon from './Subscriptionicon';

interface FeatureCardProps {
  feature: Feature;
  billingInterval?: BillingInterval;
  /** Per-feature: change monthly/yearly for this feature only */
  onBillingIntervalChange?: (featureId: number, interval: BillingInterval) => void;
  selectedPlan: PlanType | null;
  currentPlan: PlanType | null;
  /** When user has an active subscription: team_feature id for cancel. Omit to hide cancel. */
  teamFeatureId?: number | null;
  /** e.g. 'active' | 'cancelled' */
  subscriptionStatus?: string | null;
  onPlanChange: (featureId: number, plan: PlanType | null) => void;
  /** Called when user clicks "Cancel subscription" – pass id and feature name for modal. */
  onCancel?: (teamFeatureId: number, featureName: string) => void;
  onReactivate?: (teamFeatureId: number) => void;
  canReactivate?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  billingInterval = 'monthly',
  onBillingIntervalChange,
  selectedPlan,
  currentPlan,
  teamFeatureId,
  subscriptionStatus,
  onPlanChange,
  onCancel,
  onReactivate,
  canReactivate = true,
}) => {
  const meta = selectedPlan ? PLAN_META[selectedPlan] : null;
  const isActive = subscriptionStatus === 'active';
  const isCancelled = subscriptionStatus === 'cancelled';

  const getPrice = (plan: PlanType) => {
    if (billingInterval === 'yearly' && feature.pricingYearly) {
      return feature.pricingYearly[plan];
    }
    return feature.pricing[plan];
  };

  const getDiscountPercent = (plan: PlanType) => feature.yearlyDiscountPercent?.[plan] ?? 0;

  /** Amount saved per year when choosing yearly (12 * monthly - yearly price). */
  const getSaveAmount = (plan: PlanType): number => {
    if (billingInterval !== 'yearly' || !feature.pricingYearly) return 0;
    const monthly = feature.pricing[plan] ?? 0;
    const yearly = feature.pricingYearly[plan] ?? 0;
    if (monthly <= 0 || yearly <= 0) return 0;
    return Math.round((12 * monthly - yearly) * 100) / 100;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[18px] bg-white transition-all duration-200"
      style={{
        border: selectedPlan ? `1.5px solid ${meta!.border}` : '1.5px solid #E5E7EB',
        boxShadow: selectedPlan ? `0 4px 24px ${meta!.ring}` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {selectedPlan && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[18px]"
          style={{ background: `linear-gradient(90deg, ${feature.color}, ${meta!.color})` }}
        />
      )}

      {feature.badge && (
        <span
          className="absolute top-3 right-4 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide"
          style={{
            background:
              feature.badge === 'Premium Only'
                ? 'linear-gradient(135deg, #115E59, #2DD4BF)'
                : feature.badge === 'Pro Only'
                  ? 'linear-gradient(135deg, #0D9488, #115E59)'
                  : 'linear-gradient(135deg, #0D9488, #115E59)',
          }}
        >
          {feature.badge}
        </span>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${feature.color}18` }}
          >
            <SubscriptionIcon name={feature.iconName} size={20} color={feature.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] text-gray-900 mb-1">{feature.name}</div>
            <div className="text-[12.5px] text-gray-500 leading-snug">{feature.description}</div>
          </div>
        </div>

        {/* Per-feature: Monthly / Yearly */}
        {onBillingIntervalChange && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Billing</span>
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => onBillingIntervalChange(feature.id, 'monthly')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  billingInterval === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => onBillingIntervalChange(feature.id, 'yearly')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  billingInterval === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        )}

        {/* Choose plan – clear card-style options */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Choose plan</p>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_TYPES.map((plan) => {
              const isSelected = selectedPlan === plan;
              const isDisabled = !feature.plans[plan];
              const m = PLAN_META[plan];
              const price = getPrice(plan);
              const discountPct = billingInterval === 'yearly' ? getDiscountPercent(plan) : 0;
              const saveAmount = getSaveAmount(plan);
              return (
                <button
                  key={plan}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onPlanChange(feature.id, isSelected ? null : plan)}
                  className="relative flex flex-col items-center rounded-xl border-2 py-3 px-2 text-center transition-all duration-200"
                  style={{
                    background: isSelected ? m.bg : 'rgba(249,250,251,0.8)',
                    borderColor: isSelected ? m.border : 'rgba(0,0,0,0.08)',
                    boxShadow: isSelected ? `0 0 0 2px ${m.ring}` : 'none',
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {(discountPct > 0 || saveAmount > 0) && (
                    <span className="absolute -top-1.5 right-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {saveAmount > 0 ? `Save £${saveAmount}` : `${discountPct}% off`}
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: isSelected ? m.color : '#374151' }}>
                    {m.label}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-gray-500">
                    {price === 0 ? 'Free' : billingInterval === 'yearly' ? `£${price}/yr` : `£${price}/mo`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {currentPlan && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-[11px] text-emerald-700 font-semibold">
                {isCancelled ? 'Cancelled' : 'Active'}: {PLAN_META[currentPlan].label}
                {selectedPlan && selectedPlan !== currentPlan && (
                  <span className="text-[#0D9488] ml-1">→ {PLAN_META[selectedPlan].label}</span>
                )}
              </span>
            </div>
            {isActive && teamFeatureId != null && onCancel && (
              <button
                type="button"
                onClick={() => onCancel(teamFeatureId, feature.name)}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
              >
                Cancel subscription
              </button>
            )}
            {isCancelled && canReactivate && teamFeatureId != null && onReactivate && (
              <button
                type="button"
                onClick={() => onReactivate(teamFeatureId)}
                className="text-[11px] font-semibold text-[#0D9488] hover:underline"
              >
                Reactivate
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FeatureCard;