<?php

namespace Modules\Invoice\Services;

use Modules\Accounting\Models\Account;
use Modules\Accounting\Models\JournalEntry;
use Modules\Accounting\Services\JournalServiceInterface;
use Modules\Accounting\Support\SystemAccounts;
use Modules\Invoice\Models\Invoice;

/**
 * Adapts the invoicing workflow to double-entry bookkeeping:
 *  - issuing an invoice -> DR Accounts Receivable, CR Sales (and VAT)
 *  - receiving payment  -> DR Bank/Cash, CR Accounts Receivable
 *
 * All posting is idempotent and routed through the shared JournalService so the
 * general ledger stays balanced.
 */
class InvoiceAccountingService implements InvoiceAccountingServiceInterface
{
    public function __construct(private JournalServiceInterface $journal) {}

    public function postInvoice(Invoice $invoice): ?JournalEntry
    {
        if ($invoice->journal_entry_id) {
            return null;
        }

        $hostId = (int) $invoice->host_id;
        $accounts = SystemAccounts::ensureForHost($hostId);
        $vatId = Account::where('host_id', $hostId)->where('code', '1300')->value('id')
            ?? $this->ensureVat($hostId);

        $final = (float) $invoice->final_amount;
        $vat = (float) ($invoice->total_vat ?? 0);
        $net = $final - $vat;

        $lines = [
            [
                'account_id' => $accounts[SystemAccounts::AR],
                'debit' => $final,
                'description' => 'Invoice '.$invoice->code,
                'partner_type' => 'customer',
                'partner_id' => $invoice->client_id,
            ],
            [
                'account_id' => $accounts[SystemAccounts::SALES],
                'credit' => $net,
                'description' => 'Sales - '.$invoice->code,
            ],
        ];

        if ($vat > 0) {
            $lines[] = [
                'account_id' => $vatId,
                'credit' => $vat,
                'description' => 'VAT on '.$invoice->code,
            ];
        }

        $entry = $this->journal->record([
            'entry_date' => $invoice->invoice_date ?? now()->toDateString(),
            'description' => 'Invoice '.$invoice->code.' - '.$invoice->client_name,
            'reference_type' => 'invoice',
            'reference_id' => $invoice->id,
            'lines' => $lines,
        ], $invoice->created_by);

        $invoice->journal_entry_id = $entry->id;
        $invoice->save();

        return $entry;
    }

    public function postPayment(Invoice $invoice): ?JournalEntry
    {
        $existing = JournalEntry::where('host_id', $invoice->host_id)
            ->where('reference_type', 'invoice_payment')
            ->where('reference_id', $invoice->id)
            ->first();

        if ($existing) {
            return null;
        }

        $hostId = (int) $invoice->host_id;
        $accounts = SystemAccounts::ensureForHost($hostId);
        $amount = (float) $invoice->final_amount;

        $entry = $this->journal->record([
            'entry_date' => now()->toDateString(),
            'description' => 'Payment - Invoice '.$invoice->code,
            'reference_type' => 'invoice_payment',
            'reference_id' => $invoice->id,
            'lines' => [
                [
                    'account_id' => $accounts[SystemAccounts::CASH],
                    'debit' => $amount,
                    'description' => 'Bank receipt',
                ],
                [
                    'account_id' => $accounts[SystemAccounts::AR],
                    'credit' => $amount,
                    'partner_type' => 'customer',
                    'partner_id' => $invoice->client_id,
                ],
            ],
        ], $invoice->created_by);

        return $entry;
    }

    public function sync(Invoice $invoice): void
    {
        $this->postInvoice($invoice);

        if (in_array((string) $invoice->status, ['Paid', 'ReceiptSent', 'Partially Paid'], true)) {
            $this->postPayment($invoice);
        }
    }

    private function ensureVat(int $hostId): int
    {
        return Account::firstOrCreate(
            ['host_id' => $hostId, 'code' => '1300'],
            [
                'name' => 'VAT / GST Payable',
                'type' => 'liability',
                'normal_balance' => 'credit',
                'is_active' => true,
                'opening_balance' => 0,
                'current_balance' => 0,
                'account_group' => 'tax',
            ]
        )->id;
    }
}
