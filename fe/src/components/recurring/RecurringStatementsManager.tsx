'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PlanFeatureGate from '@/components/plan/PlanFeatureGate';
import {
  createRecurringStatement,
  deleteRecurringStatement,
  listRecurringStatements,
  type RecurringStatement,
  type RecurringFrequency,
} from '@/services/recurring-statements.service';
import { parseApiError } from '@/services/service';
import { isPlanRestrictionError } from '@/lib/plan-access';
import { UPGRADE_PLAN_PATH } from '@/lib/subscription-routes';
import { useRouter } from 'next/navigation';

const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export default function RecurringStatementsManager() {
  const router = useRouter();
  const [rows, setRows] = useState<RecurringStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    frequency: 'monthly' as RecurringFrequency,
    next_run_at: '',
    amount: '',
    currency: 'LKR',
    pdf_type: 'classic',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listRecurringStatements();
      setRows(data);
    } catch (error) {
      if (isPlanRestrictionError(error)) {
        return;
      }
      toast.error(parseApiError(error, 'load recurring statements'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.next_run_at) {
      toast.error('Title and next run date are required.');
      return;
    }
    try {
      setSaving(true);
      await createRecurringStatement({
        title: form.title.trim(),
        frequency: form.frequency,
        next_run_at: form.next_run_at,
        amount: form.amount ? Number(form.amount) : null,
        currency: form.currency,
        pdf_type: form.pdf_type,
      });
      toast.success('Recurring statement scheduled.');
      setForm({
        title: '',
        frequency: 'monthly',
        next_run_at: '',
        amount: '',
        currency: 'LKR',
        pdf_type: 'classic',
      });
      await load();
    } catch (error) {
      if (isPlanRestrictionError(error)) {
        toast.error(parseApiError(error, 'create recurring statement'));
        router.push(UPGRADE_PLAN_PATH);
        return;
      }
      toast.error(parseApiError(error, 'create recurring statement'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecurringStatement(id);
      toast.success('Removed.');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      toast.error(parseApiError(error, 'delete'));
    }
  };

  return (
    <PlanFeatureGate
      feature="recurring_statements"
      title="Recurring statements require Business Pro or higher"
      description="Automate recurring billing on Business Pro (£4.99), Business Premium, or Enterprise."
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring statements</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Schedule automated invoice cycles for retainer and subscription clients.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">New schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input
              placeholder="Title (e.g. Monthly retainer)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as RecurringFrequency }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.next_run_at}
              onChange={(e) => setForm((f) => ({ ...f, next_run_at: e.target.value }))}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount (optional)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Input
              placeholder="Currency"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              maxLength={3}
            />
            <Input
              placeholder="PDF template (classic, minimal, …)"
              value={form.pdf_type}
              onChange={(e) => setForm((f) => ({ ...f, pdf_type: e.target.value }))}
            />
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            <Plus className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Add schedule'}
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Frequency</th>
                <th className="text-left p-3 font-medium">Next run</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No recurring schedules yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium">{row.title}</td>
                    <td className="p-3">{row.client?.name ?? '—'}</td>
                    <td className="p-3 capitalize">{row.frequency}</td>
                    <td className="p-3">{row.next_run_at}</td>
                    <td className="p-3">{row.is_active ? 'Active' : 'Paused'}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PlanFeatureGate>
  );
}
