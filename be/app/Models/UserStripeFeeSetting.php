<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserStripeFeeSetting extends Model
{
    //
    protected $table = 'user_stripe_fee_settings';
    protected $fillable = [
        'user_id',
        'stripe_fee_percentage',
        'stripe_fixed_fee',
    ];

    protected $casts = [
        'stripe_fee_percentage' => 'float',
        'stripe_fixed_fee' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
