"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  cancelWithdrawalRequest,
  createWithdrawalRequest,
  getReferralWallet,
  getWithdrawalMethods,
  getWithdrawalNotifications,
  listWithdrawalRequests,
  markAllWithdrawalNotificationsRead,
  markWithdrawalNotificationRead,
  type PaginatedMeta,
  type ReferralWalletSummary,
  type ReferralWithdrawalNotificationItem,
  type ReferralWithdrawalRequestItem,
  type WithdrawalMethodOption,
} from "@/services/referral.service";

const PER_PAGE = 10;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-teal-50 text-teal-700",
  completed: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function money(amount: number, currency = "LKR") {
  const sym = currency === "LKR" ? "Rs." : currency === "USD" ? "$" : ` `;
  return `${sym}${Number(amount).toFixed(2)}`;
}

export default function ReferralWithdrawalsSection({
  initialWallet,
  onRefresh,
}: {
  initialWallet?: ReferralWalletSummary | null;
  onRefresh?: () => void;
}) {
  const [wallet, setWallet] = useState<ReferralWalletSummary | null>(initialWallet ?? null);
  const [methods, setMethods] = useState<WithdrawalMethodOption[]>([]);
  const [requests, setRequests] = useState<ReferralWithdrawalRequestItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<ReferralWithdrawalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(!initialWallet);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [method, setMethod] = useState("bank_transfer");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [bank, setBank] = useState({
    account_holder_name: "",
    bank_name: "",
    branch_name: "",
    account_number: "",
    swift_code: "",
    country: "GB",
    currency: "LKR",
  });
  const [paypalEmail, setPaypalEmail] = useState("");
  const [stripeEmail, setStripeEmail] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");

  const selectedMethod = useMemo(
    () => methods.find((m) => m.value === method),
    [methods, method]
  );

  const load = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const [w, m, r, n] = await Promise.all([
        getReferralWallet(),
        getWithdrawalMethods(),
        listWithdrawalRequests({ page: pageNum, per_page: PER_PAGE }),
        getWithdrawalNotifications(),
      ]);
      setWallet(w);
      setMethods(m.filter((x) => x.value !== "plan_upgrade"));
      setRequests(r.items);
      setMeta(r.meta);
      setNotifications(n.items);
      setUnreadCount(n.unread_count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load withdrawal data.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  useEffect(() => {
    if (initialWallet) setWallet(initialWallet);
  }, [initialWallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        method,
        amount: Number(amount),
        notes: notes || undefined,
      };
      if (method === "bank_transfer") Object.assign(payload, bank);
      if (method === "paypal") payload.paypal_email = paypalEmail;
      if (method === "stripe_payout") {
        payload.stripe_email = stripeEmail;
        if (stripeAccountId) payload.stripe_account_id = stripeAccountId;
      }

      await createWithdrawalRequest(payload);
      setSuccess("Withdrawal request submitted.");
      setAmount("");
      setNotes("");
      setPage(1);
      await load(1);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this pending withdrawal request?")) return;
    try {
      await cancelWithdrawalRequest(id);
      await load(page);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel.");
    }
  };

  const handleMarkRead = async (id: string) => {
    await markWithdrawalNotificationRead(id);
    await load(page);
  };

  const handleMarkAllRead = async () => {
    await markAllWithdrawalNotificationsRead();
    await load(page);
  };

  if (loading && !wallet) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading withdrawals…
      </div>
    );
  }

  const currency = wallet?.currency ?? "LKR";

  return (
    <div className="space-y-6">
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Withdrawal Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="divide-y divide-gray-100">
            {notifications.slice(0, 5).map((n) => (
              <li
                key={n.id}
                className={`px-6 py-3 text-sm ${n.read_at ? "bg-white" : "bg-teal-50/40"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{n.data.subject}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {money(n.data.amount, n.data.currency)} · {n.data.method_label} · {n.data.status_label}
                      {n.data.reference_number ? ` · Ref ${n.data.reference_number}` : ""}
                    </p>
                    {n.data.evidence_url && (
                      <a
                        href={n.data.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary)] inline-flex items-center gap-1 mt-1"
                      >
                        View evidence <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-5 border border-green-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-green-600" />
            <p className="text-xs font-medium text-green-600">Available Balance</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {money(wallet?.available_balance ?? 0, currency)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-xs font-medium text-amber-600">Pending Withdrawals</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {money(wallet?.pending_withdrawal ?? 0, currency)}
          </p>
        </div>
        <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <p className="text-xs font-medium text-teal-600">Total Withdrawn</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {money(wallet?.total_withdrawn ?? 0, currency)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Request Withdrawal</h3>
          <button type="button" onClick={() => load(page)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} (min {money(m.minimum, currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min={selectedMethod?.minimum ?? 0}
                max={wallet?.available_balance ?? undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder={selectedMethod ? `Min ${money(selectedMethod.minimum, currency)}` : ""}
              />
            </div>
          </div>

          {method === "bank_transfer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  ["account_holder_name", "Account Holder Name"],
                  ["bank_name", "Bank Name"],
                  ["branch_name", "Branch Name"],
                  ["account_number", "Account Number"],
                  ["swift_code", "SWIFT/BIC (optional)"],
                  ["country", "Country (ISO)"],
                  ["currency", "Currency"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    value={bank[key]}
                    onChange={(e) => setBank((p) => ({ ...p, [key]: e.target.value }))}
                    required={!["swift_code", "branch_name"].includes(key)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {method === "paypal" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PayPal Email</label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {method === "stripe_payout" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Account Email</label>
                <input
                  type="email"
                  value={stripeEmail}
                  onChange={(e) => setStripeEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Account ID (optional)</label>
                <input
                  value={stripeAccountId}
                  onChange={(e) => setStripeAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || (wallet?.available_balance ?? 0) <= 0}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Withdrawal History</h3>
          {meta && meta.total > 0 && (
            <span className="text-xs text-gray-500">{meta.total} total</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No withdrawal requests yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{money(r.amount, r.currency)}</td>
                    <td className="px-4 py-3">{r.method_label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.reference_number || "—"}</td>
                    <td className="px-4 py-3">
                      {r.evidence_url ? (
                        <a
                          href={r.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--primary)] inline-flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleCancel(r.id)}
                          className="text-xs text-red-600 hover:underline flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
