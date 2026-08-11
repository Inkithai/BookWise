<?php

namespace App\Models;

class InvoiceClient extends BaseModel
{
    protected $table = 'invoices_clients';
    public $timestamps = false;
    protected $guarded = [];
    protected $fillable = ['name', 'email', 'telephone', 'address', 'address_no', 'address_street', 'address_city', 'address_town', 'address_postcode', 'address_county', 'address_country', 'host_id', 'team_id', 'client_type', 'company_registration_number', 'vat_number', 'utr'];

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'client_id', 'id');
    }

    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id');
    }
}
