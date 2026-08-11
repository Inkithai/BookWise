<?php

namespace Modules\Invoice\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringStatement extends Model
{
    protected $table = 'recurring_statements';

    protected $fillable = [
        'host_id',
        'team_id',
        'client_id',
        'created_by',
        'title',
        'frequency',
        'amount',
        'currency',
        'pdf_type',
        'next_run_at',
        'last_run_at',
        'last_invoice_id',
        'last_processed_at',
        'last_error',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'next_run_at' => 'date',
        'last_run_at' => 'date',
        'is_active' => 'boolean',
        'amount' => 'decimal:2',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(InvoiceClient::class, 'client_id');
    }
}
