<?php

namespace App\Console\Commands;

use App\Services\TenantManager;
use Illuminate\Console\Command;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Services\InvoiceAccountingServiceInterface;

class SyncInvoiceLedger extends Command
{
    protected $signature = 'invoice:sync-ledger {host_id? : Optional tenant id; sync every tenant if omitted}';

    protected $description = 'Post existing invoices (AR + receipts) to the general ledger.';

    public function handle(): int
    {
        $hostId = $this->argument('host_id');

        if ($hostId) {
            TenantManager::setId((int) $hostId);
        }

        $query = Invoice::query()->whereNull('deleted_at');

        if ($hostId) {
            $query->where('host_id', (int) $hostId);
        }

        $count = 0;
        foreach ($query->cursor() as $invoice) {
            if (! $hostId) {
                TenantManager::setId((int) $invoice->host_id);
            }

            app(InvoiceAccountingServiceInterface::class)->sync($invoice);
            $count++;
        }

        $this->info("Synced {$count} invoice(s) to the ledger.");

        TenantManager::reset();

        return self::SUCCESS;
    }
}
