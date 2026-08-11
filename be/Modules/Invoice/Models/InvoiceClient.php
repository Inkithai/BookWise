<?php

namespace Modules\Invoice\Models;

use App\Models\BaseModel;
use Illuminate\Database\Eloquent\SoftDeletes;  
class InvoiceClient extends BaseModel
{
    use SoftDeletes;  

    protected $table = 'invoices_clients';
    public $timestamps = false;
    protected $guarded = [];
    protected $dates = ['deleted_at'];  // ✅ ADD

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'client_id', 'id');
    }

    public function host()
    {
        return $this->belongsTo(Host::class, 'host_id', 'id');
    }

    public function allInvoices()
    {
        return $this->hasMany(Invoice::class, 'client_id')
            ->withoutGlobalScopes()
            ->withTrashed();
    }
}