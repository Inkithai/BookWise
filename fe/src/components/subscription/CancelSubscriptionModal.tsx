'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Banknote, X, Loader2 } from 'lucide-react';

export type CancelAction = 'cancel_only' | 'request_refund';

interface CancelSubscriptionModalProps {
  featureName: string;
  teamFeatureId: number;
  onClose: () => void;
  onCancelOnly: (teamFeatureId: number) => Promise<void>;
  onRequestRefund: (teamFeatureId: number, reason?: string) => Promise<void>;
}

export default function CancelSubscriptionModal({
  featureName,
  teamFeatureId,
  onClose,
  onCancelOnly,
  onRequestRefund,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<'choose' | 'refund_reason'>('choose');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelOnly = async () => {
    setError(null);
    setLoading(true);
    try {
      await onCancelOnly(teamFeatureId);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async () => {
    if (step === 'refund_reason') {
      setError(null);
      setLoading(true);
      try {
        await onRequestRefund(teamFeatureId, reason.trim() || undefined);
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to submit refund request');
      } finally {
        setLoading(false);
      }
    } else {
      setStep('refund_reason');
    }
  };

  const handleBack = () => {
    setStep('choose');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Cancel subscription</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'choose' && (
            <>
              <p className="mb-5 text-sm text-gray-600">
                What would you like to do for <span className="font-semibold text-gray-900">{featureName}</span>?
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCancelOnly}
                  disabled={loading}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 py-4 text-left transition hover:border-[#0D9488] hover:bg-teal-50/50 disabled:opacity-50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/15 text-[#0D9488]">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Cancel & reactivate later</div>
                    <div className="text-xs text-gray-500">Stop your subscription. You can reactivate anytime.</div>
                  </div>
                  {loading && <Loader2 className="h-5 w-5 animate-spin text-[#0D9488]" />}
                </button>

                <button
                  type="button"
                  onClick={handleRequestRefund}
                  disabled={loading}
                  className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 py-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50/50 disabled:opacity-50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Request refund</div>
                    <div className="text-xs text-gray-500">Super admin will review and process your refund manually.</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === 'refund_reason' && (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Optional: add a reason for your refund request. Super admin will see this when verifying.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Duplicate charge, changed mind..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleRequestRefund}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Submit refund request'}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
