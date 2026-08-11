<?php

namespace Modules\Banking\Services;

use App\Enums\AccountType;
use App\Enums\NormalBalance;
use App\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Modules\Accounting\Models\Account;
use Modules\Accounting\Services\JournalServiceInterface;
use Modules\Banking\Models\BankAccount;
use Modules\Banking\Models\BankTransaction;
use Modules\Banking\Repositories\BankAccountInterface;
use Modules\Banking\Repositories\BankTransactionInterface;

/**
 * Banking workflow: every deposit / withdrawal is posted to the general ledger
 * (DR/CR the linked bank asset account) and recorded as a reconcilable transaction.
 */
class BankingService implements BankingServiceInterface
{
    public function __construct(
        private JournalServiceInterface $journal,
        private BankAccountInterface $accounts,
        private BankTransactionInterface $transactions
    ) {}

    public function createBankAccount(array $data, ?int $userId = null): BankAccount
    {
        return DB::transaction(function () use ($data, $userId) {
            $accountId = $data['account_id'] ?? null;

            if (empty($accountId)) {
                $hostId = TenantManager::id();
                $seq = (int) Account::forTenant($hostId)->where('sub_type', 'bank')->count() + 1;
                $coa = Account::create([
                    'host_id' => $hostId,
                    'code' => '11'.str_pad((string) $seq, 3, '0', STR_PAD_LEFT),
                    'name' => $data['name'],
                    'type' => AccountType::Asset->value,
                    'normal_balance' => NormalBalance::Debit->value,
                    'sub_type' => 'bank',
                    'account_group' => 'cash',
                    'opening_balance' => (float) ($data['opening_balance'] ?? 0),
                    'current_balance' => (float) ($data['opening_balance'] ?? 0),
                    'is_active' => true,
                    'created_by' => $userId,
                ]);
                $accountId = $coa->id;
            }

            $data['account_id'] = $accountId;
            $data['current_balance'] = (float) ($data['opening_balance'] ?? 0);

            return $this->accounts->create($data);
        });
    }

    public function recordDeposit(int $bankAccountId, array $data, ?int $userId = null): BankTransaction
    {
        return DB::transaction(function () use ($bankAccountId, $data, $userId) {
            $bank = $this->accounts->find($bankAccountId);
            abort_if(empty($bank), 404, 'Bank account not found');

            $amount = (float) $data['amount'];
            $offset = (int) $data['offset_account_id'];

            $entry = $this->journal->record([
                'entry_date' => $data['date'],
                'description' => $data['description'] ?? 'Bank deposit',
                'reference_type' => 'bank',
                'lines' => [
                    ['account_id' => $bank->account_id, 'debit' => $amount, 'description' => 'Bank deposit'],
                    ['account_id' => $offset, 'credit' => $amount, 'description' => $data['description'] ?? 'Deposit'],
                ],
            ], $userId);

            $txn = $this->transactions->create([
                'bank_account_id' => $bank->id,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'amount' => $amount,
                'direction' => 'credit',
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by' => $userId,
            ]);

            $entry->reference_id = $txn->id;
            $entry->save();

            $bank->current_balance = (float) $bank->current_balance + $amount;
            $bank->save();

            return $txn->load('journalEntry');
        });
    }

    public function recordWithdrawal(int $bankAccountId, array $data, ?int $userId = null): BankTransaction
    {
        return DB::transaction(function () use ($bankAccountId, $data, $userId) {
            $bank = $this->accounts->find($bankAccountId);
            abort_if(empty($bank), 404, 'Bank account not found');

            $amount = (float) $data['amount'];
            $offset = (int) $data['offset_account_id'];

            $entry = $this->journal->record([
                'entry_date' => $data['date'],
                'description' => $data['description'] ?? 'Bank withdrawal',
                'reference_type' => 'bank',
                'lines' => [
                    ['account_id' => $offset, 'debit' => $amount, 'description' => $data['description'] ?? 'Withdrawal'],
                    ['account_id' => $bank->account_id, 'credit' => $amount, 'description' => 'Bank withdrawal'],
                ],
            ], $userId);

            $txn = $this->transactions->create([
                'bank_account_id' => $bank->id,
                'date' => $data['date'],
                'description' => $data['description'] ?? null,
                'amount' => $amount,
                'direction' => 'debit',
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'journal_entry_id' => $entry->id,
                'created_by' => $userId,
            ]);

            $entry->reference_id = $txn->id;
            $entry->save();

            $bank->current_balance = (float) $bank->current_balance - $amount;
            $bank->save();

            return $txn->load('journalEntry');
        });
    }

    public function reconcile(int $transactionId): BankTransaction
    {
        $txn = $this->transactions->find($transactionId);
        abort_if(empty($txn), 404, 'Bank transaction not found');

        $txn->reconciled = true;
        $txn->reconciled_at = now();
        $txn->save();

        return $txn;
    }
}
