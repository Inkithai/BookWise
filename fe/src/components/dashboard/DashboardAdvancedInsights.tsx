'use client';

import { useMemo } from 'react';
import { Invoice, InvoiceStatus } from '@/services/interface/invoice';
import { formatCurrency } from '@/services/interface/invoice';
import { TrendingUp, PieChart, AlertTriangle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BOOKWISE_CONTACT_URL } from '@/lib/subscription-routes';

type Props = {
  invoices: Invoice[];
  currency: string;
  showEnterpriseBanner?: boolean;
};

const PAID_STATUSES: InvoiceStatus[] = ['Paid', 'Receipt Sent'];

export default function DashboardAdvancedInsights({
  invoices,
  currency,
  showEnterpriseBanner = false,
}: Props) {
  const insights = useMemo(() => {
    const now = new Date();
    const monthly: Record<string, number> = {};
    let paidCount = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      const status = inv.status as InvoiceStatus;
      if (PAID_STATUSES.includes(status)) {
        paidCount++;
      }
      const due = inv.due_date ? new Date(inv.due_date) : null;
      if (due && due < now && status === 'Not Paid') {
        overdueCount++;
      }

      const d = inv.invoice_date ? new Date(inv.invoice_date) : null;
      if (!d || isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(inv.final_amount ?? inv.total_amount ?? 0);
      monthly[key] = (monthly[key] ?? 0) + amount;
    }

    const chartData = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({
        month: month.slice(5) + '/' + month.slice(2, 4),
        revenue: Math.round(revenue * 100) / 100,
      }));

    const collectionRate =
      invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0;

    return { chartData, collectionRate, overdueCount, paidCount };
  }, [invoices]);

  return (
    <div className="space-y-6 mb-6 sm:mb-8">
      {showEnterpriseBanner && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <p className="text-sm font-medium text-primary">Enterprise dashboard</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Custom KPIs and reporting are available on Enterprise.{' '}
            <a
              href={BOOKWISE_CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Contact sales
            </a>{' '}
            for tailored analytics.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Collection rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.collectionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{insights.paidCount} paid of {invoices.length} invoices</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{insights.overdueCount}</p>
          <p className="text-xs text-gray-500 mt-1">Past due and not paid</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <PieChart className="w-5 h-5" />
            <span className="text-sm font-medium">Reporting currency</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{currency}</p>
          <p className="text-xs text-gray-500 mt-1">Advanced analytics</p>
        </div>
      </div>

      {insights.chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue trend (12 months)</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={insights.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
                <Tooltip
                  formatter={(value) => {
                    const num = typeof value === 'number' ? value : Number(value ?? 0);
                    return [formatCurrency(num, currency), 'Revenue'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(207, 90%, 45%)"
                  fill="hsl(207, 90%, 45%)"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
