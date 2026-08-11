// src/components/subscription/StripeCheckoutModal.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { SelectedFeature, PLAN_META } from '../../lib/Subscriptiontypes';
import SubscriptionIcon from './Subscriptionicon';
import {
  createSubscriptionPaymentIntent,
  confirmSubscriptionPayment,
  getReferralCommissionBalance,
} from '@/services/sync-subscription.service';
import { getStripePromise, STRIPE_KEY_ENV_HINT } from '@/lib/stripe-client';

const stripePromise = getStripePromise();

interface StripeCheckoutModalProps {
  items: SelectedFeature[];
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: '#F9FAFB',
  border: '1.5px solid #E5E7EB',
  borderRadius: 10,
  fontSize: 14,
  color: '#111827',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#111827',
      fontFamily: 'inherit',
      '::placeholder': { color: '#9CA3AF' },
      iconColor: '#6B7280',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
};

const StripeCheckoutModalInner: React.FC<StripeCheckoutModalProps> = ({
  items,
  total,
  onClose,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyCommission, setApplyCommission] = useState(false);
  const [availableCommission, setAvailableCommission] = useState(0);
  const [canApplyCommission, setCanApplyCommission] = useState(false);

  useEffect(() => {
    getReferralCommissionBalance()
      .then(({ balance, canApply }) => {
        setAvailableCommission(balance);
        setCanApplyCommission(canApply);
      })
      .catch(() => {
        setAvailableCommission(0);
        setCanApplyCommission(false);
      });
  }, []);

  const intervals = [...new Set(items.map((i) => i.billingInterval ?? 'monthly'))];
  const billingLabel = intervals.length > 1 ? ' total' : intervals[0] === 'yearly' ? '/year' : '/month';
  const commissionToApply = useMemo(() => {
    if (!applyCommission || availableCommission <= 0) return 0;
    return Math.min(availableCommission, total);
  }, [applyCommission, availableCommission, total]);
  const amountDue = Math.max(0, total - commissionToApply);
  const needsCard = amountDue > 0;

  const handlePay = async () => {
    if (needsCard && (!stripe || !elements)) return;
    setError(null);
    setProcessing(true);
    try {
      const payload = items.map((i) => ({
        feature_id: i.id,
        plan_slug: i.iwCheckoutSlug ?? i.plan,
        billing_interval: i.billingInterval ?? 'monthly',
      }));
      const payOptions =
        applyCommission && availableCommission > 0
          ? { use_commission_balance: true as const }
          : undefined;
      const data = await createSubscriptionPaymentIntent(payload, payOptions);

      if (data?.all_free) {
        setDone(true);
        setTimeout(() => onSuccess(), 1500);
        return;
      }

      const clientSecret = data?.client_secret;
      if (!clientSecret) {
        setError('Could not start payment. Please try again.');
        setProcessing(false);
        return;
      }

      const cardNumberElement = elements?.getElement(CardNumberElement);
      if (!cardNumberElement) {
        setError('Card form not ready. Please try again.');
        setProcessing(false);
        return;
      }

      const { error: confirmError } = await stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: { name: name || undefined },
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed.');
        setProcessing(false);
        return;
      }

      const checkoutId = data?.checkout_id;
      if (checkoutId != null) {
        await confirmSubscriptionPayment(checkoutId);
      }

      setDone(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Payment failed. Please try again.';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[440px] bg-white rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
        >
          <div>
            <div className="text-white font-extrabold text-[18px] mb-0.5">Secure Payment</div>
            <div className="text-white/55 text-[12px]">
              Your subscription · £{amountDue.toFixed(2)}{billingLabel}
              {commissionToApply > 0 ? ` (${commissionToApply.toFixed(2)} commission applied)` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-lg text-white font-extrabold text-[13px] tracking-tight"
              style={{ background: '#635BFF' }}
            >
              stripe
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}
            >
              <SubscriptionIcon name="X" size={16} color="#fff" />
            </button>
          </div>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 8px 30px rgba(16,185,129,0.35)',
              }}
            >
              <SubscriptionIcon name="Check" size={32} color="#fff" />
            </motion.div>
            <div className="font-extrabold text-[22px] text-gray-900 mb-2">Payment Successful!</div>
            <div className="text-gray-500 text-[14px]">
              Your subscription is now active. Redirecting to dashboard…
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-gray-50 rounded-xl px-4 py-3.5 mb-5">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-[13px] text-gray-700 py-1">
                  <span>
                    {item.name}
                    <span
                      className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: PLAN_META[item.plan].bg,
                        color: PLAN_META[item.plan].color,
                        border: `1px solid ${PLAN_META[item.plan].border}`,
                      }}
                    >
                      {item.planBadgeLabel ?? PLAN_META[item.plan].label}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {item.price > 0 ? `£${item.price}${(item.billingInterval ?? 'monthly') === 'yearly' ? '/yr' : '/mo'}` : 'Free'}
                  </span>
                </div>
              ))}
              {commissionToApply > 0 && (
                <div className="flex justify-between text-[13px] text-green-700 py-1">
                  <span>Referral commission</span>
                  <span>-£{commissionToApply.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-extrabold text-[15px] text-gray-900">
                <span>Due today{intervals.length > 1 ? '' : intervals[0] === 'yearly' ? ' (yearly)' : ''}</span>
                <span className="text-[#0D9488]">£{amountDue.toFixed(2)}</span>
              </div>
            </div>

            {canApplyCommission && availableCommission > 0 && total > 0 && (
              <label className="mb-4 flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCommission}
                  onChange={(e) => setApplyCommission(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Apply referral commission (£{availableCommission.toFixed(2)} available)
                  {applyCommission && commissionToApply > 0 && amountDue === 0
                    ? ' — full amount covered by commission.'
                    : applyCommission && commissionToApply > 0
                      ? ` — £${commissionToApply.toFixed(2)} will be applied.`
                      : ''}
                </span>
              </label>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            {needsCard && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Cardholder Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    style={inputBaseStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Card details</label>
                  <div
                    className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] p-3 space-y-3"
                    style={{ borderWidth: '1.5px', minHeight: 120 }}
                  >
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                      <CardNumberElement options={CARD_OPTIONS} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                        <CardExpiryElement options={CARD_OPTIONS} />
                      </div>
                      <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
                        <CardCvcElement options={CARD_OPTIONS} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full mt-5 flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all duration-200"
              style={{
                background: processing
                  ? 'linear-gradient(135deg, #9CA3AF, #6B7280)'
                  : 'linear-gradient(135deg, #635BFF, #0D9488)',
                boxShadow: processing ? 'none' : '0 4px 20px rgba(99,91,255,0.4)',
                border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {processing ? (
                <>
                  <div className="w-[18px] h-[18px] rounded-full border-[2.5px] border-white/30 border-t-white animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <SubscriptionIcon name="Lock" size={16} color="#fff" />
                  {needsCard ? `Pay £${amountDue.toFixed(2)}${billingLabel}` : 'Complete upgrade with commission'}
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11.5px] text-gray-400">
              <SubscriptionIcon name="Lock" size={12} color="#9CA3AF" />
              256-bit SSL encryption · PCI DSS compliant
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = (props) => {
  if (!stripePromise) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <p className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 p-4">
            Stripe publishable key is missing. Add{' '}
            <code className="font-mono text-xs">{STRIPE_KEY_ENV_HINT}</code> to your{' '}
            <code className="font-mono text-xs">.env</code> (same{' '}
            <code className="font-mono text-xs">pk_test_…</code> /{' '}
            <code className="font-mono text-xs">pk_live_…</code> as BookWise{' '}
            <code className="font-mono text-xs">STRIPE_KEY</code>), then restart{' '}
            <code className="font-mono text-xs">npm run dev</code>.
          </p>
          <button
            type="button"
            onClick={props.onClose}
            className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutModalInner {...props} />
    </Elements>
  );
};

export default StripeCheckoutModal;
