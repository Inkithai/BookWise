<?php

namespace Modules\Banking\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Accounting\Models\Account;

/**
 * @OA\Schema(
 *     schema="BankAccount",
 *     title="Bank Account",
 *     description="A bank or cash account linked to the ledger",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Barclays Current"),
 *     @OA\Property(property="account_type", type="string", example="checking"),
 *     @OA\Property(property="current_balance", type="number", format="float", example=15400.20)
 * )
 */
class BankAccount extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'bank_accounts';

    protected $guarded = [];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'is_active' => 'boolean',
        'account_number' => 'encrypted',
    ];

    protected $dates = ['deleted_at'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BankTransaction::class);
    }
}
