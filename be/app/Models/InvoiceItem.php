<?php

namespace App\Models;

use App\Traits\OwnerTrait;

class InvoiceItem extends BaseModel
{
    use OwnerTrait;

    protected $table = 'invoice_items';

    protected $guarded = [];


}
