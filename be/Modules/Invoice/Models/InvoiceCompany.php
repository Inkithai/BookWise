<?php

namespace Modules\Invoice\Models;

use App\Models\BaseModel;
use App\Models\Host;

class InvoiceCompany extends BaseModel
{
    protected $table = 'invoices_companies';

    protected $fillable = [
        'id', 'host_id', 'code', 'name', 'address', 'email', 'account_name', 
        'account_number', 'sort_code', 'address_no', 'address_street', 'address_city', 
        'address_town', 'address_postcode', 'address_county', 'address_country'
    ];

    // Disable automatic timestamps
    public $timestamps = false;

    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }
}
