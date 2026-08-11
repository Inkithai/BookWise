<?php

namespace Modules\Invoice\Models;

use App\Enums\InvoicePaymentStatusEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\OwnerTrait;
use App\Traits\ScopeTrait;
use App\Enums\InvoiceStatus;
use App\Models\Host;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\User\Models\User;

/**
 * @OA\Schema(
 *     schema="Invoice",
 *     title="Invoice",
 *     description="Invoice schema",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="client", type="string", example="Acme Ltd"),
 *     @OA\Property(property="invoice_date", type="string", format="date", example="2024-07-10"),
 *     @OA\Property(property="total_amount", type="number", format="float", example=5000.00),
 *     @OA\Property(property="total_discount", type="number", format="float", example=200.00),
 *     @OA\Property(property="final_amount", type="number", format="float", example=4800.00),
 *     @OA\Property(property="status", type="string", example="Paid"),
 *     @OA\Property(property="created_by", type="string", example="Admin"),
 * )
 */
class Invoice extends Model
{
    use HasFactory;

    use ScopeTrait, OwnerTrait, SoftDeletes;

    protected $table = 'invoices';

    protected $guarded = [];

    protected $dates = ['deleted_at'];

    protected $casts = [
        'status' => InvoiceStatus::class,
        'payment_status' => InvoicePaymentStatusEnum::class,
        'stripe_response' => "array",
        'payment_link' => 'boolean',
        'bank_payment' => 'boolean',
        'cis_enabled' => 'boolean',
        'pdf_field_visibility' => 'array',
    ];

    /**
     * Model-level enforcement: host_id is required
     * 
     * Single enforcement point - prevents creating invoices without tenant boundary.
     * Simple, impossible to bypass via ORM, no hidden state.
     */
    protected static function booted()
    {
        static::creating(function ($invoice) {
            if (empty($invoice->host_id)) {
                throw new \DomainException('host_id is required for all invoices');
            }
        });
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('item_name', 'asc');
    }

    public function latestReceipt()
    {
        return $this->hasMany(Receipt::class)->latest()->first();
    }

    public function receipts()
    {
        return $this->hasMany(Receipt::class);
    }

    /**
     * Get the host (tenant owner) for this invoice
     */
    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }

    /**
     * Get the billing company (business entity for invoice billing info)
     * 
     * NOT tenant scoping - this is a FK to billing company information.
     */
    public function billingCompany()
    {
        return $this->belongsTo(InvoiceCompany::class, 'host_id', 'host_id');
    }

    /**
     * Backward-compatible alias used by existing PDF/email templates.
     */
    public function company()
    {
        return $this->belongsTo(InvoiceCompany::class, 'host_id', 'host_id');
    }

    public function client()
    {
        return $this->belongsTo(InvoiceClient::class, 'client_id', 'id');
    }

    public function type()
    {
        return $this->belongsTo(InvoiceType::class, 'type_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
