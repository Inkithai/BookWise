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
import { Wallet, CreditCard, X, CheckCircle2 } from 'lucide-react';
import type { BillingInterval } from '@/lib/Subscriptiontypes';
import {
  confirmSubscriptionPayment,
  createSubscriptionPaymentIntent,
  getReferralCommissionBalance,
} from '@/services/sync-subscription.service';
import { getStripePromise } from '@/lib/stripe-client';

const stripePromise = getStripePromise();

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#111827',
      fontFamily: 'inherit',
      '::placeholder': { color: '#9CA3AF' },
    },
    invalid: { color: '#EF4444' },
  },
};

export interface PlanUpgradeCheckoutModalProps {
  invoiceFeatureId: number;
  iwCheckoutSlug: string;
  planLabel: string;
  price: number;
  billingInterval: BillingInterval;
  onClose: () => void;
  onSuccess: () => void;
}

function StripeCardForm({ name, onNameChange }: { name: string; onNameChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" /> Card payment
      </p>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Cardholder name</label>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="John Doe"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>
      <div className="space-y-2">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
          <CardNumberElement options={CARD_OPTIONS} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <CardExpiryElement options={CARD_OPTIONS} />
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <CardCvcElement options={CARD_OPTIONS} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanUpgradeCheckoutModal(props: PlanUpgradeCheckoutModalProps) {
  const { invoiceFeatureId, iwCheckoutSlug, planLabel, price, billingInterval, onClose, onSuccess } =
    props;

  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [availableCommission, setAvailableCommission] = useState(0);
  const [canApplyCommission, setCanApplyCommission] = useState(false);
  const [applyCommission, setApplyCommission] = useState(false);

  useEffect(() => {
    getReferralCommissionBalance()
      .then(({ balance, canApply }) => {
        setAvailableCommission(balance);
        setCanApplyCommission(canApply);
        if (canApply && balance > 0) setApplyCommission(true);
      })
      .catch(() => {
        setAvailableCommission(0);
        setCanApplyCommission(false);
      })
      .finally(() => setLoadingBalance(false));
  }, []);

  const billingLabel = billingInterval === 'yearly' ? '/year' : '/month';
  const commissionToApply = useMemo(() => {
    if (!applyCommission || availableCommission <= 0) return 0;
    return Math.min(availableCommission, price);
  }, [applyCommission, availableCommission, price]);
  const amountDue = Math.max(0, price - commissionToApply);
  const needsCard = amountDue > 0;
  const commissionCoversAll = applyCommission && commissionToApply > 0 && amountDue === 0;

  const runCheckout = async (stripe: ReturnType<typeof useStripe>, elements: ReturnType<typeof useElements>) => {
    if (needsCard && (!stripe || !elements)) return;
    setError(null);
    setProcessing(true);
    try {
      const payload = [
        {
          feature_id: invoiceFeatureId,
          plan_slug: iwCheckoutSlug,
          billing_interval: billingInterval,
        },
      ];
      const payOptions =
        applyCommission && availableCommission > 0
          ? { use_commission_balance: true as const }
          : undefined;

      const data = await createSubscriptionPaymentIntent(payload, payOptions);

      if (data?.all_free) {
        setDone(true);
        setTimeout(onSuccess, 1500);
        return;
      }

      const clientSecret = data?.client_secret;
      if (!clientSecret) throw new Error('Could not start payment. Please try again.');

      const cardNumberElement = elements?.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error('Card form not ready. Please try again.');

      const { error: confirmError } = await stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: { name: name || undefined },
        },
      });

      if (confirmError) throw new Error(confirmError.message || 'Payment failed.');

      if (data?.checkout_id != null) {
        await confirmSubscriptionPayment(data.checkout_id);
      }

      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const CommissionOnlyButton = () => (
    <button
      type="button"
      onClick={() => void runCheckout(null, null)}
      disabled={processing}
      className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 bg-green-600 hover:bg-green-700"
    >
      {processing ? 'Processing…' : 'Complete upgrade with commission'}
    </button>
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Subscribe to {planLabel}</h2>
            <p className="text-sm text-slate-500">
              £{price.toFixed(2)}{billingLabel}
              {commissionToApply > 0 && ` · £${amountDue.toFixed(2)} due after commission`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">Subscription activated</p>
            <p className="text-sm text-slate-500 mt-1">
              {commissionCoversAll
                ? 'Your plan was upgraded using referral commission.'
                : 'Payment successful. Updating your plan…'}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{planLabel}</span>
                <span className="font-medium">£{price.toFixed(2)}</span>
              </div>
              {commissionToApply > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Referral commission</span>
                  <span>-£{commissionToApply.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                <span>Due today</span>
                <span>£{amountDue.toFixed(2)}</span>
              </div>
            </div>

            {loadingBalance ? (
              <p className="text-sm text-slate-500">Loading commission balance…</p>
            ) : canApplyCommission && availableCommission > 0 ? (
              <label className="flex items-start gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyCommission}
                  onChange={(e) => setApplyCommission(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    Use referral commission
                  </p>
                  <p className="text-xs text-green-800 mt-1">
                    £{availableCommission.toFixed(2)} available
                    {applyCommission && commissionToApply > 0
                      ? commissionCoversAll
                        ? ' — covers the full plan price. No card required.'
                        : ` — £${commissionToApply.toFixed(2)} applied. Pay £${amountDue.toFixed(2)} by card.`
                      : ''}
                  </p>
                </div>
              </label>
            ) : canApplyCommission ? (
              <p className="text-sm text-slate-500 rounded-lg border border-slate-200 p-3">
                No referral commission balance. Pay the full amount by card below.
              </p>
            ) : null}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {commissionCoversAll ? (
              <CommissionOnlyButton />
            ) : needsCard ? (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <div className="space-y-4">
                    <StripeCardForm name={name} onNameChange={setName} />
                    <StripePayBridge
                      processing={processing}
                      label={`Pay £${amountDue.toFixed(2)} and subscribe`}
                      onPay={runCheckout}
                    />
                    <p className="text-center text-xs text-slate-400">Card payments secured by Stripe</p>
                  </div>
                </Elements>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Card payments are unavailable (Stripe not configured). Uncheck commission if balance is
                  insufficient, or contact support.
                </p>
              )
            ) : (
              <CommissionOnlyButton />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );

  return modalContent;
}

function StripePayBridge({
  processing,
  label,
  onPay,
}: {
  processing: boolean;
  label: string;
  onPay: (stripe: ReturnType<typeof useStripe>, elements: ReturnType<typeof useElements>) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <button
      type="button"
      onClick={() => onPay(stripe, elements)}
      disabled={processing || !stripe || !elements}
      className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 bg-teal-600 hover:bg-teal-700"
    >
      {processing ? 'Processing…' : label}
    </button>
  );
}
