// src/components/subscription/CheckoutPanel.tsx
'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SelectedFeature, PLAN_META } from '../../lib/Subscriptiontypes';
import SubscriptionIcon from './Subscriptionicon';

interface CheckoutPanelProps {
  items: SelectedFeature[];
  onCheckout: () => void;
  onClear: () => void;
}

const CheckoutPanel: React.FC<CheckoutPanelProps> = ({ items, onCheckout, onClear }) => {
  const total = items.reduce((s, i) => s + i.price, 0);
  const hasPaid = items.some((i) => i.price > 0);
  const intervals = [...new Set(items.map((i) => i.billingInterval ?? 'monthly'))];
  const isMixed = intervals.length > 1;
  const isYearly = !isMixed && intervals[0] === 'yearly';

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[18px] p-7 text-center">
        <div className="text-4xl mb-3">🛒</div>
        <div className="font-bold text-gray-700 mb-1.5">No features selected</div>
        <div className="text-[13px] text-gray-400">
          Select a plan for any feature to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-[18px] overflow-hidden shadow-lg shadow-gray-100/50">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #0D9488, #115E59)' }}>
        <div className="flex items-center gap-2.5 text-white">
          <SubscriptionIcon name="ShoppingCart" size={18} color="#fff" />
          <span className="font-bold text-[15px]">Subscription Summary</span>
        </div>
      </div>

      {/* Line items */}
      <div className="px-5 py-4 border-b border-gray-100">
        <AnimatePresence>
          {items.map((item) => {
            const meta = PLAN_META[item.plan];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18` }}
                  >
                    <SubscriptionIcon name={item.iconName} size={15} color={item.color} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">{item.name}</div>
                    <span
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-bold text-[14px]"
                    style={{ color: item.price > 0 ? '#111827' : '#10B981' }}
                  >
                    {item.price > 0
                      ? `£${item.price}${(item.billingInterval ?? 'monthly') === 'yearly' ? '/yr' : '/mo'}`
                      : 'Free'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total + CTA */}
      <div className="px-5 py-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] font-semibold text-gray-600">
            {isMixed ? 'Total' : isYearly ? 'Yearly Total' : 'Monthly Total'}
          </span>
          <span className="font-extrabold text-[22px] text-[#0D9488]">
            £{total}
            {!isMixed && <span className="text-[13px] font-normal text-gray-400">{isYearly ? '/yr' : '/mo'}</span>}
          </span>
        </div>

        {hasPaid ? (
          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-[15px] transition-transform duration-150 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #0D9488, #115E59)',
              boxShadow: '0 4px 14px rgba(52,144,220,0.35)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <SubscriptionIcon name="Lock" size={16} color="#fff" />
            Proceed to Payment
            <SubscriptionIcon name="ArrowRight" size={16} color="#fff" />
          </button>
        ) : (
          <button
            onClick={onCheckout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-[15px]"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <SubscriptionIcon name="Check" size={16} color="#fff" />
            Activate Free Plan
          </button>
        )}

        {hasPaid && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11.5px] text-gray-400">
            <SubscriptionIcon name="Lock" size={12} color="#9CA3AF" />
            Powered by Stripe · Cancel anytime
          </div>
        )}

        <button
          onClick={onClear}
          className="w-full mt-2 py-1.5 text-[12px] text-gray-300 hover:text-red-400 transition-colors duration-150 bg-transparent border-none cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        >
          Clear all selections
        </button>
      </div>

      {/* Help tip */}
      <div
        className="mx-4 mb-4 rounded-xl px-4 py-3.5"
        style={{ background: 'linear-gradient(135deg, #F0FDFA, #F5F3FF)', border: '1px solid rgba(52,144,220,0.15)' }}
      >
        <div className="flex gap-2.5 items-start">
          <SubscriptionIcon name="Zap" size={15} color="#0D9488" />
          <div>
            <div className="text-[12px] font-bold text-teal-800 mb-1">Mix & Match Plans</div>
            <div className="text-[11px] text-gray-500 leading-relaxed">
              Each feature has its own plan. CRM on Premium, WhatsApp on Free — you only pay for what you use.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPanel;