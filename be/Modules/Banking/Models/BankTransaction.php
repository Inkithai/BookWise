<?php

namespace Modules\Banking\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Accounting\Models\JournalEntry;

/**
 * @OA\Schema(
 *     schema="BankTransaction",
 *     title="Bank Transaction",
 *     description="A deposit or withdrawal on a bank account",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="amount", type="number", format="float", example=500.00),
 *     @OA\Property(property="direction", type="string", example="credit"),
 *     @OA\Property(property="reconciled", type="boolean", example=false)
 * )
 */
class BankTransaction extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;

    protected $table = 'bank_transactions';

    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'reconciled' => 'boolean',
        'reconciled_at' => 'datetime',
        'date' => 'date',
    ];

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}
