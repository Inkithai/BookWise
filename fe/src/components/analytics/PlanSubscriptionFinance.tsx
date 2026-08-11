'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  PoundSterling,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getSubscriptionFinanceOverview,
  type PlanSubscriptionSection,
  type SubscriptionFinanceHostRow,
  type SubscriptionFinanceOverview,
  type SubscriptionFinanceTransaction,
} from '@/services/subscriptionFinance.service';

function monthStartIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: string): string {
  const code = currency === 'LKR' ? 'LKR' : currency;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'trialing':
      return 'bg-teal-100 text-teal-800';
    case 'past_due':
      return 'bg-amber-100 text-amber-800';
    case 'canceled':
    case 'inactive':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function SummaryCards({
  summary,
  currency,
  periodLabel,
}: {
  summary: SubscriptionFinanceOverview['summary'];
  currency: string;
  periodLabel: string;
}) {
  const cards = [
    {
      label: `Revenue (${periodLabel})`,
      value: formatMoney(summary.total_revenue, currency),
      sub: `${summary.transaction_count} payment${summary.transaction_count === 1 ? '' : 's'}`,
      icon: PoundSterling,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Hosts subscribed',
      value: String(summary.total_hosts),
      sub: 'Distinct workspaces in period',
      icon: Building2,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Billing accounts',
      value: String(summary.total_subscribers),
      sub: `${summary.active_subscribers} active · ${summary.trialing_subscribers} trialing`,
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: 'Needs attention',
      value: String(summary.past_due_subscribers),
      sub: 'Past due subscriptions',
      icon: CreditCard,
      color: summary.past_due_subscribers > 0 ? 'text-amber-600' : 'text-slate-500',
      bg: summary.past_due_subscribers > 0 ? 'bg-amber-50' : 'bg-slate-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

function HostTable({
  hosts,
  currency,
}: {
  hosts: SubscriptionFinanceHostRow[];
  currency: string;
}) {
  if (hosts.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-slate-500 text-center border-t border-slate-100">
        No billing accounts matched for this plan in the date range. If payments exist, widen the
        date range or check subscription plan names in the database.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-slate-100">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3 font-medium">Host</th>
            <th className="text-left p-3 font-medium">Billing account</th>
            <th className="text-left p-3 font-medium">Companies</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Paid in period</th>
            <th className="text-right p-3 font-medium">Plan amount</th>
            <th className="text-left p-3 font-medium">Next payment</th>
            <th className="text-left p-3 font-medium">Trial ends</th>
            <th className="p-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {hosts.map((row) => (
            <tr
              key={`${row.owner_user_id}-${row.host_id ?? 'none'}`}
              className="border-t border-slate-100 hover:bg-slate-50/80"
            >
              <td className="p-3">
                <p className="font-medium text-slate-900">{row.host_name}</p>
                {row.host_id != null && (
                  <p className="text-xs text-slate-400">Host #{row.host_id}</p>
                )}
              </td>
              <td className="p-3">
                <p className="text-slate-800">{row.owner_name ?? '—'}</p>
                <p className="text-xs text-slate-500">{row.owner_email}</p>
                {!row.owner_is_active && (
                  <span className="text-xs text-rose-600 font-medium block">Account inactive</span>
                )}
                {row.is_super_admin && (
                  <span className="text-xs text-amber-700 font-medium block">Super admin</span>
                )}
              </td>
              <td className="p-3 text-slate-600 max-w-[160px] truncate">
                {row.companies.length > 0 ? row.companies.join(', ') : '—'}
              </td>
              <td className="p-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.subscription_status)}`}
                >
                  {row.subscription_status.replace('_', ' ')}
                </span>
                {row.plan_type && (
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">{row.plan_type}</p>
                )}
              </td>
              <td className="p-3 text-right font-semibold text-emerald-700">
                {row.paid_in_period > 0
                  ? formatMoney(row.paid_in_period, currency)
                  : '—'}
              </td>
              <td className="p-3 text-right text-slate-700">
                {formatMoney(row.amount, currency)}
              </td>
              <td className="p-3 text-slate-600 whitespace-nowrap text-xs">
                {formatDateShort(row.next_payment_at)}
              </td>
              <td className="p-3 text-slate-600 whitespace-nowrap text-xs">
                {formatDateShort(row.trial_ends_at)}
              </td>
              <td className="p-3">
                <Link
                  href={`/analytics/edit/${row.owner_user_id}`}
                  className="inline-flex text-teal-600 hover:text-teal-800"
                  title="Manage account"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanSection({
  plan,
  currency,
  defaultOpen,
}: {
  plan: PlanSubscriptionSection;
  currency: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const priceLabel =
    plan.is_free || plan.monthly_price <= 0
      ? 'Free'
      : `${formatMoney(plan.monthly_price, currency)}/mo`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/80 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-6">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="font-semibold text-slate-900">{plan.name}</h3>
              <span className="text-sm text-slate-500">{priceLabel}</span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-semibold text-teal-700">{plan.host_count}</span> host
              {plan.host_count === 1 ? '' : 's'}
              {' · '}
              <span className="font-semibold text-slate-800">{plan.subscriber_count}</span>{' '}
              account{plan.subscriber_count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="sm:text-right">
            {plan.payment_count > 0 || plan.revenue_in_period > 0 ? (
              <>
                <p className="text-lg font-bold text-emerald-700">
                  {formatMoney(plan.revenue_in_period, currency)}
                </p>
                <p className="text-xs text-slate-500">
                  {plan.payment_count} payment{plan.payment_count === 1 ? '' : 's'} in period
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No payments in period</p>
            )}
          </div>
        </div>
      </button>
      {open && <HostTable hosts={plan.hosts} currency={currency} />}
    </div>
  );
}

function TransactionHistory({
  transactions,
  currency,
  planFilter,
}: {
  transactions: SubscriptionFinanceTransaction[];
  currency: string;
  planFilter: string;
}) {
  const filtered = useMemo(() => {
    if (!planFilter || planFilter === 'all') return transactions;
    return transactions.filter((t) => t.plan_slug === planFilter);
  }, [transactions, planFilter]);

  if (transactions.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        No payments recorded in this date range.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-3 font-medium">Date</th>
            <th className="text-left p-3 font-medium">Plan</th>
            <th className="text-left p-3 font-medium">Account</th>
            <th className="text-left p-3 font-medium">Host(s)</th>
            <th className="text-right p-3 font-medium">Amount</th>
            <th className="text-left p-3 font-medium">Type</th>
            <th className="text-left p-3 font-medium">Reference</th>
            <th className="p-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-6 text-center text-slate-500">
                No transactions for the selected plan.
              </td>
            </tr>
          ) : (
            filtered.map((tx) => (
              <tr key={tx.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="p-3 whitespace-nowrap text-slate-700">
                  {formatDateLabel(tx.paid_at)}
                </td>
                <td className="p-3 font-medium text-slate-900">{tx.plan_name}</td>
                <td className="p-3">
                  <p className="text-slate-800">{tx.owner_name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{tx.owner_email}</p>
                  {tx.is_super_admin && (
                    <span className="text-xs text-amber-700 font-medium">Super admin</span>
                  )}
                </td>
                <td className="p-3 text-slate-600">
                  {tx.host_names.length > 0 ? tx.host_names.join(', ') : '—'}
                </td>
                <td className="p-3 text-right font-semibold text-emerald-700">
                  {formatMoney(tx.amount, currency)}
                </td>
                <td className="p-3 capitalize text-slate-600">{tx.plan_type ?? '—'}</td>
                <td className="p-3">
                  {tx.payment_intent_id ? (
                    <span
                      className="text-xs font-mono text-slate-500 truncate max-w-[120px] inline-block"
                      title={tx.payment_intent_id}
                    >
                      {tx.payment_intent_id.slice(-12)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3">
                  <Link
                    href={`/analytics/edit/${tx.owner_user_id}`}
                    className="inline-flex text-teal-600 hover:text-teal-800"
                    title="View account"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanSubscriptionFinance() {
  const [data, setData] = useState<SubscriptionFinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(monthStartIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [txPlanFilter, setTxPlanFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getSubscriptionFinanceOverview({
        start_date: startDate,
        end_date: endDate,
      });
      setData(result);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string } } };
      if (ax.response?.status === 403) {
        setError('Only super-admins can view subscription financial details.');
      } else {
        setError(ax.response?.data?.message ?? 'Failed to load subscription data.');
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = data?.currency ?? 'LKR';
  const plans = data?.plans ?? [];
  const hasActivity = plans.some((p) => p.subscriber_count > 0 || p.revenue_in_period > 0);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-rose-800 text-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 text-sm text-teal-600 hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Date range</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter hosts subscribed and payments received in this period.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sf-start" className="text-xs">
                From
              </Label>
              <Input
                id="sf-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sf-end" className="text-xs">
                To
              </Label>
              <Input
                id="sf-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 h-9"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 text-sm">
          Loading subscription finance…
        </div>
      ) : (
        <>
          {data?.summary && (
            <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
              <SummaryCards
                summary={data.summary}
                currency={currency}
                periodLabel={data.period.month_label}
              />
            </div>
          )}

          {/* Per-plan breakdown */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Subscriptions by plan
              {data?.period && (
                <span className="font-normal text-slate-500 ml-2">
                  {formatDateShort(data.period.start_date)} –{' '}
                  {formatDateShort(data.period.end_date)}
                </span>
              )}
            </h2>
            {!hasActivity && !loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
                No subscriptions or payments in this period. Try a wider date range or check
                that billing records exist in the system.
              </div>
            ) : (
              <div className={`space-y-3 ${loading ? 'opacity-50' : ''}`}>
                {plans.map((plan) => (
                  <PlanSection
                    key={plan.slug}
                    plan={plan}
                    currency={currency}
                    defaultOpen={
                      plan.subscriber_count > 0 ||
                      plan.host_count > 0 ||
                      plan.payment_count > 0
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Transaction history</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Payments received in the selected period (from subscription records).
                </p>
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={txPlanFilter} onValueChange={setTxPlanFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={loading ? 'opacity-50' : ''}>
              <TransactionHistory
                transactions={data?.transactions ?? []}
                currency={currency}
                planFilter={txPlanFilter}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
