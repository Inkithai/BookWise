/**
 * Plan matrix labels — keep in sync with invoicingapi config/plan_catalog.php
 */
export const PLAN_LIMIT_KEYS = [
  'invoices',
  'clients',
  'receipts',
  'quotations',
  'team_members',
  'templates',
  'send_invoices',
] as const;

export const PLAN_FEATURE_ROWS: Array<{
  key: string;
  label: string;
  type: 'limit' | 'feature' | 'dashboard' | 'templates';
}> = [
  { key: 'invoices', label: 'Monthly invoices', type: 'limit' },
  { key: 'clients', label: 'Saved clients', type: 'limit' },
  { key: 'receipts', label: 'Monthly payment receipts', type: 'limit' },
  { key: 'quotations', label: 'Monthly quotations', type: 'limit' },
  { key: 'team_members', label: 'Team members', type: 'limit' },
  { key: 'templates', label: 'Invoice templates', type: 'limit' },
  { key: 'any_currency', label: 'Bill in any currency', type: 'feature' },
  { key: 'recurring_statements', label: 'Recurring statements', type: 'feature' },
  { key: 'accept_online_payments', label: 'Accept online payments', type: 'feature' },
  { key: 'branding', label: 'Branding', type: 'feature' },
  { key: 'send_invoices', label: 'Send invoices (monthly)', type: 'limit' },
  { key: 'multiple_businesses', label: 'Multiple businesses', type: 'feature' },
];

export function formatPlanLimit(key: string, value: number): string {
  if (value === -1) {
    const unlimited: Record<string, string> = {
      invoices: 'Unlimited monthly invoices',
      clients: 'Unlimited saved clients',
      receipts: 'Unlimited monthly payment receipts',
      quotations: 'Unlimited monthly quotations',
      team_members: 'Unlimited team members',
      templates: 'Unlimited templates / full gallery',
      send_invoices: 'Unlimited send invoices',
    };
    return unlimited[key] ?? `Unlimited ${key.replace(/_/g, ' ')}`;
  }
  const labels: Record<string, string> = {
    invoices: `${value} monthly invoices`,
    clients: `${value} saved clients`,
    receipts: `${value} monthly payment receipts`,
    quotations: `${value} monthly quotations`,
    team_members: `${value} team member${value === 1 ? '' : 's'}`,
    templates:
      value === 1
        ? '1 template (preview others)'
        : `${value} invoice templates`,
    send_invoices: `${value} send invoices per month`,
  };
  return labels[key] ?? `${value} ${key.replace(/_/g, ' ')}`;
}

export function formatTemplatesAccess(access: string, templateLimit?: number): string {
  const a = access.toLowerCase();
  if (a === 'all') return 'Access to all template gallery';
  if (a === 'custom') return 'Customized templates';
  if (a === 'three') return '3 templates';
  if (templateLimit === 1) {
    return '1 template — preview others / 1-month full access trial';
  }
  return `${templateLimit ?? 1} template(s)`;
}

export function buildPlanComparisonRows(
  limits: Record<string, number> = {},
  features: Record<string, unknown> = {},
): Array<{ text: string; included: boolean }> {
  const rows: Array<{ text: string; included: boolean }> = [];
  const all = Boolean(features.all);

  for (const row of PLAN_FEATURE_ROWS) {
    if (row.type === 'limit') {
      const val = limits[row.key];
      if (val == null) continue;
      rows.push({
        text: formatPlanLimit(row.key, Number(val)),
        included: true,
      });
      continue;
    }
    if (row.key === 'templates' || row.type === 'templates') {
      continue;
    }
    const included = all || Boolean(features[row.key]);
    rows.push({ text: row.label, included });
  }

  const templatesAccess = String(features.templates_access ?? 'preview');
  const templateLimit = limits.templates;
  if (templateLimit != null || templatesAccess) {
    rows.splice(5, 0, {
      text: formatTemplatesAccess(templatesAccess, Number(templateLimit ?? 1)),
      included: true,
    });
  }

  return rows;
}

export const INVOICE_PLAN_DISPLAY: Record<
  string,
  { name: string; slug: string; monthlyHint: string }
> = {
  free: { name: 'Free', slug: 'trial', monthlyHint: 'Free' },
  starter: { name: 'Business Pro', slug: 'Starter', monthlyHint: '£4.99/mo' },
  professional: { name: 'Business Premium', slug: 'Professional', monthlyHint: '£14.99/mo' },
  enterprise: { name: 'Enterprise', slug: 'Enterprise', monthlyHint: 'Get quote' },
};

/** Static matrix — keep in sync with invoicingapi config/plan_catalog.php */
export const PLAN_MATRIX = {
  free: {
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    limits: {
      invoices: 10,
      clients: 10,
      receipts: 10,
      quotations: -1,
      team_members: 3,
      templates: 1,
      send_invoices: 10,
    },
    features: {
      any_currency: true,
      branding: true,
      accept_online_payments: false,
      multiple_businesses: false,
      recurring_statements: false,
      crm: false,
      dashboard_tier: 'standard',
      templates_access: 'preview',
    },
  },
  starter: {
    slug: 'starter',
    name: 'Business Pro',
    monthlyPrice: 4.99,
    limits: {
      invoices: 100,
      clients: 300,
      receipts: 100,
      quotations: -1,
      team_members: 10,
      templates: 3,
      send_invoices: 100,
    },
    features: {
      any_currency: false,
      branding: true,
      accept_online_payments: false,
      multiple_businesses: false,
      recurring_statements: true,
      crm: true,
      dashboard_tier: 'standard',
      templates_access: 'three',
    },
  },
  professional: {
    slug: 'professional',
    name: 'Business Premium',
    monthlyPrice: 14.99,
    limits: {
      invoices: 500,
      clients: -1,
      receipts: 500,
      quotations: -1,
      team_members: 30,
      templates: -1,
      send_invoices: -1,
    },
    features: {
      any_currency: true,
      branding: true,
      accept_online_payments: true,
      multiple_businesses: true,
      recurring_statements: true,
      crm: true,
      dashboard_tier: 'advanced',
      templates_access: 'all',
    },
  },
  enterprise: {
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    limits: {
      invoices: -1,
      clients: -1,
      receipts: -1,
      quotations: -1,
      team_members: -1,
      templates: -1,
      send_invoices: -1,
    },
    features: {
      any_currency: true,
      branding: true,
      accept_online_payments: true,
      multiple_businesses: true,
      recurring_statements: true,
      crm: true,
      dashboard_tier: 'custom',
      templates_access: 'custom',
      all: true,
    },
  },
} as const;

export type PlanMatrixKey = keyof typeof PLAN_MATRIX;

export const PLAN_MATRIX_ORDER: PlanMatrixKey[] = [
  'free',
  'starter',
  'professional',
  'enterprise',
];

export function buildComparisonTableFromMatrix(): Array<{
  name: string;
  free: string;
  pro: string;
  premium: string;
  enterprise: string;
}> {
  const cols = {
    free: PLAN_MATRIX.free,
    pro: PLAN_MATRIX.starter,
    premium: PLAN_MATRIX.professional,
    enterprise: PLAN_MATRIX.enterprise,
  };

  const cell = (plan: (typeof PLAN_MATRIX)[PlanMatrixKey], row: (typeof PLAN_FEATURE_ROWS)[number]): string => {
    if (row.type === 'limit') {
      const val = plan.limits[row.key as keyof typeof plan.limits];
      if (val == null) return '—';
      return val === -1 ? 'Unlimited' : String(val);
    }
    if (row.key === 'templates') {
      return formatTemplatesAccess(
        String(plan.features.templates_access ?? 'preview'),
        plan.limits.templates,
      );
    }
    if (row.key === 'branding' && plan.slug === 'free') {
      return '1 month full';
    }
    const included = Boolean((plan.features as Record<string, unknown>)[row.key]);
    return included ? '✓' : '✗';
  };

  const rows: Array<{ name: string; free: string; pro: string; premium: string; enterprise: string }> = [];

  for (const row of PLAN_FEATURE_ROWS) {
    if (row.key === 'templates') continue;
    rows.push({
      name: row.label,
      free: cell(cols.free, row),
      pro: cell(cols.pro, row),
      premium: cell(cols.premium, row),
      enterprise: cell(cols.enterprise, row),
    });
  }

  rows.splice(5, 0, {
    name: 'Templates',
    free: cell(cols.free, { key: 'templates', label: 'Templates', type: 'templates' }),
    pro: cell(cols.pro, { key: 'templates', label: 'Templates', type: 'templates' }),
    premium: cell(cols.premium, { key: 'templates', label: 'Templates', type: 'templates' }),
    enterprise: cell(cols.enterprise, { key: 'templates', label: 'Templates', type: 'templates' }),
  });

  return rows;
}
