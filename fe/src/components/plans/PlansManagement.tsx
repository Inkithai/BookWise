'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseApiError } from '@/services/service';
import {
  loadAdminPlansWithMeta,
  updateInvoicePlanVisibility,
  updatePlanEntitlements,
  type AdminPlanRow,
} from '@/services/plans.service';

import { PLAN_FEATURE_ROWS, PLAN_LIMIT_KEYS } from '@/lib/plan-catalog';

const FEATURE_KEYS = [
  'any_currency',
  'branding',
  'accept_online_payments',
  'multiple_businesses',
  'recurring_statements',
] as const;

const TIER_KEYS = ['dashboard_tier', 'templates_access'] as const;

const LIMIT_KEYS = [...PLAN_LIMIT_KEYS] as const;

type EntitlementsForm = {
  slug: string;
  invoiceSlug: string;
  name: string;
  features: Record<string, boolean | string>;
  limits: Record<string, number>;
};

const defaultFeatures = (): Record<string, boolean | string> => ({
  ...Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])),
  dashboard_tier: 'standard',
  templates_access: 'preview',
});

const defaultLimits = () =>
  Object.fromEntries(LIMIT_KEYS.map((k) => [k, 0])) as Record<string, number>;

export default function PlansManagement() {
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EntitlementsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { rows, platformError } = await loadAdminPlansWithMeta();
      setPlans(rows);
      if (platformError) {
        toast.warning(
          `Invoice plans loaded, but BookWise billing plans could not be fetched: ${platformError}`,
        );
      }
    } catch (error) {
      toast.error(parseApiError(error, 'load plans'));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openEdit = (plan: AdminPlanRow) => {
    setForm({
      slug: plan.slug,
      invoiceSlug: plan.invoiceSlug,
      name: plan.name,
      features: { ...defaultFeatures(), ...plan.features },
      limits: { ...defaultLimits(), ...plan.limits },
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form) return;

    try {
      setSaving(true);
      await updatePlanEntitlements(form.slug, {
        features: form.features,
        limits: form.limits,
        name: form.name,
      });
      toast.success('Feature validation rules saved');
      setDialogOpen(false);
      await loadPlans();
    } catch (error) {
      toast.error(parseApiError(error, 'save entitlements'));
    } finally {
      setSaving(false);
    }
  };

  const setFeature = (key: string, value: boolean | string) => {
    setForm((prev) =>
      prev ? { ...prev, features: { ...prev.features, [key]: value } } : prev,
    );
  };

  const setLimit = (key: string, value: number) => {
    setForm((prev) => (prev ? { ...prev, limits: { ...prev.limits, [key]: value } } : prev));
  };

  const patchPlanRow = (slug: string, patch: Partial<AdminPlanRow>) => {
    setPlans((prev) =>
      prev.map((row) => (row.slug === slug ? { ...row, ...patch } : row)),
    );
  };

  const handleInvoicePublicToggle = async (plan: AdminPlanRow, checked: boolean) => {
    const key = `invoice-public-${plan.slug}`;
    setTogglingKey(key);
    try {
      const updated = await updateInvoicePlanVisibility(plan.slug, {
        is_public: checked,
        ...(checked ? { is_active: true } : {}),
      });
      patchPlanRow(plan.slug, {
        invoicePublic: updated.is_public !== false,
        invoiceActive: updated.is_active !== false,
        invoicePlanId: updated.id,
        entitlementId: updated.id,
      });
      toast.success(
        checked ? 'Plan will show on the upgrade page.' : 'Plan hidden from upgrade page.',
      );
    } catch (error) {
      toast.error(parseApiError(error, 'update plan visibility'));
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 max-w-2xl">
          Plans and prices are managed on{' '}
          <span className="font-medium">api.bookwise.io</span>. Use the toggles below to show
          or hide plans on the customer upgrade page without re-running seeders. Feature limits are
          edited per plan under Actions.
        </p>
        <Button variant="outline" size="sm" onClick={() => void loadPlans()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Monthly</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Yearly</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice slug</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Upgrade UI</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Show on upgrade</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Validation</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Loading plans from BookWise…
                  </td>
                </tr>
              )}
              {!loading && plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No plans returned from BookWise API.
                  </td>
                </tr>
              )}
              {!loading &&
                plans.map((plan) => {
                  const featureCount = Object.values(plan.features).filter(Boolean).length;
                  const limitCount = Object.keys(plan.limits).length;

                  return (
                    <tr key={plan.slug} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{plan.name}</div>
                        <div className="text-xs text-slate-500">{plan.slug}</div>
                        {plan.isTrial && (
                          <span className="mt-1 inline-flex text-xs text-amber-700">Trial plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {plan.monthlyPrice != null ? `£${Number(plan.monthlyPrice).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {plan.yearlyPrice != null ? `£${Number(plan.yearlyPrice).toFixed(2)}` : '—'}
                        {plan.yearlyDiscountPercent != null && plan.yearlyDiscountPercent > 0 && (
                          <span className="block text-xs text-emerald-600">
                            {plan.yearlyDiscountPercent}% yearly off
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {plan.invoiceSlug}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                          <span className={plan.iwActive ? 'text-emerald-700' : 'text-red-600'}>
                            BookWise billing: {plan.iwActive ? 'Active' : 'Inactive'}
                          </span>
                          <span
                            className={
                              plan.invoiceActive && plan.invoicePublic
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            Upgrade page:{' '}
                            {plan.invoiceActive && plan.invoicePublic
                              ? 'Visible'
                              : plan.invoiceActive
                                ? 'Hidden (not public)'
                                : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={plan.invoicePublic && plan.invoiceActive}
                          disabled={togglingKey === `invoice-public-${plan.slug}`}
                          onCheckedChange={(checked) =>
                            void handleInvoicePublicToggle(plan, checked)
                          }
                          aria-label={`Show ${plan.name} on upgrade page`}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {entitlementIdOrConfigured(plan) ? (
                          <span className="text-emerald-700">
                            {featureCount} features · {limitCount} limits
                          </span>
                        ) : (
                          <span className="text-amber-700">Not configured</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Features
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit feature validation</DialogTitle>
          </DialogHeader>

          {form && (
            <div className="grid gap-4 py-2">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">{form.name}</span> ({form.slug})
                </p>
                <p className="text-xs mt-1">
                  Billing is read-only from BookWise. Saving updates Invoice validation only
                  (slug: <code>{form.invoiceSlug}</code>).
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Features</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(form.features[key])}
                        onChange={(e) => setFeature(key, e.target.checked)}
                      />
                      {key.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dashboard tier</Label>
                    <select
                      className="w-full border rounded-md px-2 py-1.5 text-sm"
                      value={String(form.features.dashboard_tier ?? 'standard')}
                      onChange={(e) => setFeature('dashboard_tier', e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Templates access</Label>
                    <select
                      className="w-full border rounded-md px-2 py-1.5 text-sm"
                      value={String(form.features.templates_access ?? 'preview')}
                      onChange={(e) => setFeature('templates_access', e.target.value)}
                    >
                      <option value="preview">Preview / 1 template</option>
                      <option value="three">3 templates</option>
                      <option value="all">All gallery</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Limits</h4>
                <p className="text-xs text-slate-500 mb-2">Use -1 for unlimited.</p>
                <div className="grid grid-cols-2 gap-3">
                  {LIMIT_KEYS.map((key) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{key.replace(/_/g, ' ')}</Label>
                      <Input
                        type="number"
                        value={form.limits[key] ?? 0}
                        onChange={(e) => setLimit(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save validation rules'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function entitlementIdOrConfigured(plan: AdminPlanRow): boolean {
  if (plan.entitlementId != null) return true;
  return (
    Object.keys(plan.features).length > 0 ||
    Object.keys(plan.limits).some((k) => plan.limits[k] != null)
  );
}
