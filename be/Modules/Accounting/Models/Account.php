<?php

namespace Modules\Accounting\Models;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Accounting\Models\JournalEntryLine;

/**
 * @OA\Schema(
 *     schema="Account",
 *     title="Account",
 *     description="A node in the Chart of Accounts",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="code", type="string", example="4000"),
 *     @OA\Property(property="name", type="string", example="Sales Revenue"),
 *     @OA\Property(property="type", type="string", example="income"),
 *     @OA\Property(property="normal_balance", type="string", example="credit"),
 *     @OA\Property(property="is_system", type="boolean", example=false),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="opening_balance", type="number", format="float", example=0),
 *     @OA\Property(property="current_balance", type="number", format="float", example=12500.50)
 * )
 */
class Account extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'accounts';

    protected $guarded = [];

    protected $casts = [
        'type' => AccountType::class,
        'normal_balance' => NormalBalance::class,
        'is_system' => 'boolean',
        'is_active' => 'boolean',
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'tax_rate' => 'decimal:4',
    ];

    protected $dates = ['deleted_at'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOfType(Builder $query, AccountType $type): Builder
    {
        return $query->where('type', $type->value);
    }

    /**
     * A debit increases the balance when the account's normal balance is debit.
     */
    public function isDebitNormal(): bool
    {
        return $this->normal_balance === NormalBalance::Debit;
    }
}
