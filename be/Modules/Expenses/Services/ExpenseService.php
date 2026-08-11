<?php

namespace Modules\Expenses\Services;

use App\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Modules\Accounting\Services\JournalServiceInterface;
use Modules\Accounting\Support\SystemAccounts;
use Modules\Banking\Models\BankAccount;
use Modules\Expenses\Models\Expense;
use Modules\Expenses\Models\ExpenseCategory;
use Modules\Expenses\Repositories\ExpenseInterface;
use Modules\Purchases\Models\Vendor;

/**
 * Expense capture: each expense is posted to the ledger (DR expense account,
 * CR the funding source - bank, cash or a vendor payable).
 */
class ExpenseService implements ExpenseServiceInterface
{
    public function __construct(
        private JournalServiceInterface $journal,
        private ExpenseInterface $expenses
    ) {}

    public function createCategory(array $data, ?int $userId = null): ExpenseCategory
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }
        $data['created_by'] = $userId;

        return ExpenseCategory::create($data);
    }

    public function createExpense(array $data, ?int $userId = null): Expense
    {
        return DB::transaction(function () use ($data, $userId) {
            $hostId = TenantManager::id();

            $category = ! empty($data['category_id'])
                ? ExpenseCategory::find($data['category_id'])
                : null;

            $expenseAccountId = $data['account_id']
                ?? ($category?->account_id)
                ?? SystemAccounts::ensureForHost($hostId)[SystemAccounts::EXPENSE];

            // Determine the funding source (credit side).
            $creditAccountId = null;
            if (! empty($data['bank_account_id'])) {
                $creditAccountId = BankAccount::findOrFail((int) $data['bank_account_id'])->account_id;
            } elseif (! empty($data['vendor_id'])) {
                $vendor = Vendor::findOrFail((int) $data['vendor_id']);
                $creditAccountId = $vendor->account_id
                    ?? SystemAccounts::ensureForHost($hostId)[SystemAccounts::AP];
            } else {
                $creditAccountId = SystemAccounts::ensureForHost($hostId)[SystemAccounts::CASH];
            }

            $amount = (float) $data['amount'];

            $entry = $this->journal->record([
                'entry_date' => $data['date'],
                'description' => $data['description'] ?? 'Expense',
                'reference_type' => 'expense',
                'lines' => [
                    ['account_id' => $expenseAccountId, 'debit' => $amount, 'description' => $data['description'] ?? 'Expense'],
                    ['account_id' => $creditAccountId, 'credit' => $amount, 'description' => 'Funding source'],
                ],
            ], $userId);

            $expense = $this->expenses->create([
                'category_id' => $data['category_id'] ?? null,
                'account_id' => $expenseAccountId,
                'vendor_id' => $data['vendor_id'] ?? null,
                'bank_account_id' => $data['bank_account_id'] ?? null,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'bank',
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by' => $userId,
            ]);

            return $expense->load('category', 'account', 'vendor', 'bankAccount', 'journalEntry');
        });
    }
}
