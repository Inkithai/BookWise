<?php

namespace Modules\Invoice\Models;

use App\Models\BaseModel;
use App\Traits\OwnerTrait;
use App\Traits\ScopeTrait;
use App\Enums\InvoiceStatus;
use Modules\User\Models\User;

class Receipt extends BaseModel
{
    use ScopeTrait, OwnerTrait;

    protected $table = 'invoice_receipts';

    protected $guarded = [];

    protected $casts = [
        'status' => InvoiceStatus::class,
    ];


    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id', 'id');
    }

    public function client()
    {
        return $this->belongsTo(InvoiceClient::class, 'client_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
