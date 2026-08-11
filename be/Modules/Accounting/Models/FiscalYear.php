<?php

namespace Modules\Accounting\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FiscalYear extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'fiscal_years';

    protected $guarded = [];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
    ];

    protected $dates = ['deleted_at', 'start_date', 'end_date'];

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_current', true);
    }
}
