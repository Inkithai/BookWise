<?php

namespace Modules\Invoice\Models;

use App\Models\BaseModel;

class InvoiceType extends BaseModel
{
    protected $table = 'invoices_types';
    protected $guarded = [];
}
