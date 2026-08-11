<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSubscription extends Model
{
    //
    use HasFactory;

    protected $fillable = [
        'user_id',
        'plan_id',
        'plan_type',
        'plan_name',
        'payment_intent_id',
        'status',
        'trial_ends_at',
        'next_payment_at',
        'stripe_customer_id',
        'stripe_subscription_id',
        'paid_at',
        'stripe_payment_method_id',
        'amount',
        'grace_ends_at',
        'trial_reminders_sent',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'next_payment_at' => 'datetime',
        'grace_ends_at' => 'datetime',
        'paid_at' => 'datetime',
        'amount' => 'decimal:2',
        'trial_reminders_sent' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function isTrial()
    {
        return $this->status === 'trialing' && $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function isActive()
    {
        return $this->status === 'active';
    }
}
