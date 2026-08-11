<?php

namespace Modules\Accounting\Models;

use App\Enums\JournalEntryStatus;
use App\Traits\OwnerTrait;
use App\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @OA\Schema(
 *     schema="JournalEntry",
 *     title="Journal Entry",
 *     description="A balanced double-entry posting in the general ledger",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="entry_number", type="string", example="JE-000012"),
 *     @OA\Property(property="entry_date", type="string", format="date", example="2026-08-11"),
 *     @OA\Property(property="description", type="string", example="Invoice INV-0007 to Acme Ltd"),
 *     @OA\Property(property="status", type="string", example="posted"),
 *     @OA\Property(property="total_amount", type="number", format="float", example=1200.00),
 *     @OA\Property(property="reference_type", type="string", example="invoice")
 * )
 */
class JournalEntry extends Model
{
    use HasFactory;
    use TenantScoped;
    use OwnerTrait;
    use SoftDeletes;

    protected $table = 'journal_entries';

    protected $guarded = [];

    protected $casts = [
        'status' => JournalEntryStatus::class,
        'total_amount' => 'decimal:2',
        'entry_date' => 'date',
        'posted_at' => 'datetime',
    ];

    protected $dates = ['deleted_at', 'posted_at'];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class)->orderBy('line_order')->orderBy('id');
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class, 'fiscal_year_id');
    }

    public function reversedEntry(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversed_entry_id');
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', JournalEntryStatus::Posted->value);
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', JournalEntryStatus::Draft->value);
    }

    public function isPosted(): bool
    {
        return $this->status === JournalEntryStatus::Posted;
    }
}
