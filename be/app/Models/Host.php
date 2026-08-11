<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\InvoiceStatus;
use Carbon\Carbon;

class Host extends Model
{
    use HasFactory;

    protected $table = 'hosts';

    protected $guarded = [];

    protected $fillable = [
        'name',
        'theme_color',
        'invoice_theme_color',
    ];

    public function hostUser()
    {
        return $this->hasOne(HostUser::class, 'host_id', 'id');
    }

    public function hostUserDetails()
    {
        return $this->hasMany(HostUserDetail::class, 'host_id', 'id');
    }

    public function invoiceClients()
    {
        return $this->hasMany(InvoiceClient::class, 'host_id', 'id');
    }

    public function invoice()
    {
        return $this->hasMany(Invoice::class, 'company_id', 'id');
    }

    public function monthlyInvoiceCount()
    {
        return $this->invoice()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
    }

    public function monthlyReceiptSentCount()
    {
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();

        return $this->invoiceClients()->with('invoices')->get()
            ->flatMap(function ($client) use ($start, $end) {
                return $client->invoices->filter(function ($invoice) use ($start, $end) {
                    return $invoice->status === InvoiceStatus::ReceiptSent
                        && $invoice->updated_at->between($start, $end);
                });
            })
            ->count();
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

}
