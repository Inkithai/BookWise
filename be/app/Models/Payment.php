<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'user_id', 'payment_intent_id', 'amount', 'currency',
        'payment_method', 'status',
        'billing_name','billing_email','billing_phone',
        'billing_address_line1','billing_address_line2','billing_city',
        'billing_state','billing_zip','billing_country',
        'stripe_payload'
    ];

    protected $casts = [
        'stripe_payload' => 'array'
    ];
}
