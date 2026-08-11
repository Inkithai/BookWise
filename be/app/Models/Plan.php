<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'price',
        'description',
        'monthly_price',
        'yearly_price',
        'currency',
        'is_free',
        'is_vip',
        'is_public',
        'is_active',
        'trial_eligible',
        'sort_order',
        'features',
        'limits',
        'monthly_invoices',
        'saved_clients',
        'monthly_payment_receipts',
        'monthly_quotations',
        'team_members',
        'templates',
        'bill_any_currency',
        'dashboard',
        'recurring_statements',
        'accept_online_payments',
        'branding',
        'send_invoices',
        'multiple_businesses',
        'crm',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'yearly_price' => 'decimal:2',
        'is_free' => 'boolean',
        'is_vip' => 'boolean',
        'is_public' => 'boolean',
        'is_active' => 'boolean',
        'trial_eligible' => 'boolean',
        'features' => 'array',
        'limits' => 'array',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class, 'plan_id');
    }

    public function hosts(): HasMany
    {
        return $this->hasMany(Host::class);
    }
}
