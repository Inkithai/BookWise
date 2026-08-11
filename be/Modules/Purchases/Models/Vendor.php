<?php

namespace Modules\Purchases\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Accounting\Models\Account;

/**
 * @OA\Schema(schema="Vendor", type="object", title="Vendor")
 */
class Vendor extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'vendors';

    protected $guarded = [];

    protected $casts = [
        'opening_balance' => 'decimal:2',
    ];

    protected $dates = ['deleted_at'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }
}
