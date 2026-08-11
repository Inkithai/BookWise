<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'owner_user_id',
        'host_id',
        'company_name',
        'business_email',
        'company_address',
        'company_currency',
        'is_active',
        'account_name',
        'account_number',
        'sort_code',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
