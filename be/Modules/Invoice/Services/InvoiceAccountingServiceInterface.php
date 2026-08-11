<?php

namespace Modules\Invoice\Services;

use Modules\Accounting\Models\JournalEntry;
use Modules\Invoice\Models\Invoice;

interface InvoiceAccountingServiceInterface
{
    /**
     * Post the accounts-receivable entry for an issued invoice (idempotent).
     */
    public function postInvoice(Invoice $invoice): ?JournalEntry;

    /**
     * Post the cash receipt that clears accounts-receivable (idempotent).
     */
    public function postPayment(Invoice $invoice): ?JournalEntry;

    /**
     * Keep the ledger in step with the invoice's current status.
     */
    public function sync(Invoice $invoice): void;
}
