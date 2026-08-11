<?php

namespace Modules\Accounting\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AccountingSetting extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'accounting_settings';

    protected $guarded = [];

    protected $casts = [
        'fiscal_year_start_month' => 'integer',
        'decimal_precision' => 'integer',
        'lock_date' => 'date',
    ];

    protected $dates = ['deleted_at', 'lock_date'];
}
