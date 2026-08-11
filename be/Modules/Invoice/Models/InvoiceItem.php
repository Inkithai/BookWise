<?php

namespace Modules\Invoice\Models;

use App\Models\BaseModel;
use App\Traits\OwnerTrait;

class InvoiceItem extends BaseModel
{
    use OwnerTrait;

    protected $table = 'invoice_items';

    protected $guarded = [];



    protected $casts = [
        'custom_fields' => 'array',
    ];
}
