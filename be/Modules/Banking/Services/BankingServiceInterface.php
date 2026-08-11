<?php

namespace Modules\Banking\Services;

use Modules\Banking\Models\BankAccount;
use Modules\Banking\Models\BankTransaction;

interface BankingServiceInterface
{
    public function createBankAccount(array $data, ?int $userId = null): BankAccount;

    public function recordDeposit(int $bankAccountId, array $data, ?int $userId = null): BankTransaction;

    public function recordWithdrawal(int $bankAccountId, array $data, ?int $userId = null): BankTransaction;

    public function reconcile(int $transactionId): BankTransaction;
}
