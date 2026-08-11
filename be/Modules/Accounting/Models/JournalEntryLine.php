<?php

namespace Modules\Accounting\Models;

use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @OA\Schema(
 *     schema="JournalEntryLine",
 *     title="Journal Entry Line",
 *     description="A single debit or credit line of a journal entry",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="account_id", type="integer", example=12),
 *     @OA\Property(property="description", type="string", example="Service revenue"),
 *     @OA\Property(property="debit", type="number", format="float", example=0),
 *     @OA\Property(property="credit", type="number", format="float", example=1200.00)
 * )
 */
class JournalEntryLine extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;

    protected $table = 'journal_entry_lines';

    protected $guarded = [];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'line_order' => 'integer',
    ];

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function isDebit(): bool
    {
        return (float) $this->debit > 0;
    }
}
