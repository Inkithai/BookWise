<?php

namespace Modules\Purchases\Services;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Services\JournalServiceInterface;
use Modules\Accounting\Support\SystemAccounts;
use Modules\Banking\Models\BankAccount;
use Modules\Purchases\Models\Bill;
use Modules\Purchases\Models\BillPayment;
use Modules\Purchases\Models\Vendor;
use Modules\Purchases\Repositories\BillInterface;
use Modules\Purchases\Repositories\VendorInterface;

/**
 * Accounts-payable workflow: recording a supplier bill posts the expense and
 * the liability (AP) to the ledger; paying the bill reduces AP via the bank.
 */
class PurchaseService implements PurchaseServiceInterface
{
    public function __construct(
        private JournalServiceInterface $journal,
        private VendorInterface $vendors,
        private BillInterface $bills
    ) {}

    public function createVendor(array $data, ?int $userId = null): Vendor
    {
        return DB::transaction(function () use ($data, $userId) {
            $accountId = $data['account_id'] ?? null;

            if (empty($accountId)) {
                $hostId = TenantManager::id();
                $coa = Account::create([
                    'host_id' => $hostId,
                    'code' => '21'.str_pad((string) (Vendor::forTenant($hostId)->count() + 1), 3, '0', STR_PAD_LEFT),
                    'name' => 'Accounts Payable - '.$data['name'],
                    'type' => AccountType::Liability->value,
                    'normal_balance' => NormalBalance::Credit->value,
                    'sub_type' => 'ap',
                    'account_group' => 'payable',
                    'opening_balance' => 0,
                    'current_balance' => 0,
                    'is_active' => true,
                    'created_by' => $userId,
                ]);
                $accountId = $coa->id;
            }

            $data['account_id'] = $accountId;
            $data['opening_balance'] = (float) ($data['opening_balance'] ?? 0);

            return $this->vendors->create($data);
        });
    }

    public function createBill(array $data, ?int $userId = null): Bill
    {
        return DB::transaction(function () use ($data, $userId) {
            $vendor = $this->vendors->find((int) $data['vendor_id']);
            abort_if(empty($vendor), 404, 'Vendor not found');

            $hostId = TenantManager::id();
            $apAccountId = $data['account_id'] ?? $vendor->account_id
                ?? SystemAccounts::ensureForHost($hostId)[SystemAccounts::AP];

            $normalized = [];
            $subtotal = $tax = $total = 0;

            foreach ($data['items'] as $it) {
                $qty = (float) ($it['quantity'] ?? 1);
                $price = (float) ($it['unit_price'] ?? 0);
                $amount = (float) ($it['amount'] ?? ($qty * $price));
                $rate = (float) ($it['tax_rate'] ?? 0);
                $taxAmt = $amount * $rate / 100;
                $lineTotal = $amount + $taxAmt;

                $subtotal += $amount;
                $tax += $taxAmt;
                $total += $lineTotal;

                $normalized[] = [
                    'description' => $it['description'],
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'tax_rate' => $rate,
                    'amount' => $amount,
                    'account_id' => $it['account_id'],
                ];
            }

            $bill = $this->bills->create([
                'vendor_id' => $vendor->id,
                'bill_number' => $data['bill_number'],
                'bill_date' => $data['bill_date'],
                'due_date' => $data['due_date'] ?? null,
                'subtotal' => $subtotal,
                'tax_amount' => $tax,
                'total' => $total,
                'account_id' => $apAccountId,
                'status' => 'approved',
                'note' => $data['note'] ?? null,
                'created_by' => $userId,
            ]);

            $this->bills->createItems($bill, $normalized);

            $lines = [];
            foreach ($normalized as $it) {
                $lineTotal = $it['amount'] + ($it['amount'] * $it['tax_rate'] / 100);
                $lines[] = [
                    'account_id' => $it['account_id'],
                    'debit' => round($lineTotal, 2),
                    'description' => $it['description'],
                    'partner_type' => 'vendor',
                    'partner_id' => $vendor->id,
                ];
            }
            $lines[] = [
                'account_id' => $apAccountId,
                'credit' => round($total, 2),
                'description' => 'Bill '.$bill->bill_number,
                'partner_type' => 'vendor',
                'partner_id' => $vendor->id,
            ];

            $entry = $this->journal->record([
                'entry_date' => $data['bill_date'],
                'description' => 'Bill '.$bill->bill_number.' - '.$vendor->name,
                'reference_type' => 'bill',
                'reference_id' => $bill->id,
                'lines' => $lines,
            ], $userId);

            $bill->journal_entry_id = $entry->id;
            $bill->save();

            return $bill->load('items', 'vendor', 'journalEntry');
        });
    }

    public function recordPayment(int $billId, array $data, ?int $userId = null): BillPayment
    {
        return DB::transaction(function () use ($billId, $data, $userId) {
            $bill = $this->bills->find($billId);
            abort_if(empty($bill), 404, 'Bill not found');

            $amount = (float) $data['amount'];
            $bank = BankAccount::findOrFail((int) $data['bank_account_id']);

            $entry = $this->journal->record([
                'entry_date' => $data['payment_date'],
                'description' => 'Payment - Bill '.$bill->bill_number,
                'reference_type' => 'bill',
                'reference_id' => $bill->id,
                'lines' => [
                    ['account_id' => $bill->account_id, 'debit' => $amount, 'partner_type' => 'vendor', 'partner_id' => $bill->vendor_id],
                    ['account_id' => $bank->account_id, 'credit' => $amount],
                ],
            ], $userId);

            $payment = BillPayment::create([
                'host_id' => $bill->host_id,
                'bill_id' => $bill->id,
                'bank_account_id' => $bank->id,
                'payment_date' => $data['payment_date'],
                'amount' => $amount,
                'reference' => $data['reference'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by' => $userId,
            ]);

            $bill->amount_paid = (float) $bill->amount_paid + $amount;
            $bill->status = abs($bill->amount_paid - (float) $bill->total) < 0.005 ? 'paid' : 'partially_paid';
            $bill->save();

            return $payment->load('journalEntry', 'bankAccount');
        });
    }

    public function voidBill(int $billId): Bill
    {
        return DB::transaction(function () use ($billId) {
            $bill = $this->bills->find($billId);
            abort_if(empty($bill), 404, 'Bill not found');

            if ($bill->journalEntry) {
                $this->journal->reverse($bill->journalEntry);
            }

            $bill->status = 'void';
            $bill->save();

            return $bill;
        });
    }
}
