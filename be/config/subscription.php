<?php

return [
    /** Standard trial length for new registrations and trial plan subscriptions. */
    'trial_days' => (int) env('SUBSCRIPTION_TRIAL_DAYS', 30),

    /** Grace period after trial ends before status becomes trial_end. */
    'grace_days' => (int) env('SUBSCRIPTION_GRACE_DAYS', 5),

    /** Days until due date on auto-generated recurring invoices. */
    'recurring_due_days' => (int) env('SUBSCRIPTION_RECURRING_DUE_DAYS', 30),

    'currency' => env('SUBSCRIPTION_CURRENCY', 'lkr'),

    'free_plan_slug' => env('SUBSCRIPTION_FREE_PLAN_SLUG', 'free'),

    /** Complimentary plan for existing users promised full access (no billing emails). */
    'vip_plan_slug' => env('SUBSCRIPTION_VIP_PLAN_SLUG', 'vip'),

    /** BookWise team_features row for the Invoice product. */
    'invoice_feature_slug' => env('SUBSCRIPTION_INVOICE_FEATURE_SLUG', 'invoice'),

    /**
     * Map BookWise plan slugs (billing) → Invoice plan slugs (entitlements).
     * Platform checkout uses: free, pro, premium. Invoice validates: free, starter, professional, enterprise.
     */
    'platform_to_app_plan_slug' => [
        'trial' => 'free',
        'free' => 'free',
        'pro' => 'starter',
        'premium' => 'professional',
        'starter' => 'starter',
        'professional' => 'professional',
        'enterprise' => 'enterprise',
        // Production Platform plan names (PascalCase slugs)
        'Starter' => 'starter',
        'Professional' => 'professional',
        'Enterprise' => 'enterprise',
        'vip' => 'vip',
        'VIP' => 'vip',
    ],

    /** Limit keys enforced per host (via primary billing user subscription). */
    'limit_keys' => [
        'invoices',
        'clients',
        'receipts',
        'quotations',
        'team_members',
        'templates',
        'send_invoices',
    ],

    /** Boolean / tier feature keys for canUseFeature(). */
    'feature_keys' => [
        'any_currency',
        'branding',
        'accept_online_payments',
        'multiple_businesses',
        'recurring_statements',
        'crm',
    ],
];
