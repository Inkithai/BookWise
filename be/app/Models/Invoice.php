<?php

namespace App\Models;

use App\Enums\InvoicePaymentStatusEnum;
use App\Models\InvoiceType;
use App\Traits\OwnerTrait;
use App\Traits\ScopeTrait;
use App\Models\InvoiceItem;
use App\Enums\InvoiceStatus;

class Invoice extends BaseModel
{
    use ScopeTrait, OwnerTrait;

    protected $table = 'invoices';

    protected $guarded = [];

    protected $casts = [
        'status' => InvoiceStatus::class,
        'payment_status' => InvoicePaymentStatusEnum::class,
        'stripe_response' => "array",
        'payment_link' => 'boolean',
        'bank_payment' => 'boolean'

    ];

    public function items()
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('id', 'DESC');
    }

    public function latestReceipt()
    {
        return $this->hasMany(Receipt::class)->latest()->first();
    }

    public function receipts()
    {
        return $this->hasMany(Receipt::class);
    }

    public function company()
    {
        return $this->belongsTo(InvoiceCompany::class, 'company_id', 'host_id');
    }

    public function host()
    {
        return $this->belongsTo(Host::class, 'company_id', 'id');
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
