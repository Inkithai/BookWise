<?php

namespace App\Models;

class InvoiceCompany extends BaseModel
{
    protected $table = 'invoices_companies';

    protected $guarded = [];

    // Disable automatic timestamps
    public $timestamps = false;
}
