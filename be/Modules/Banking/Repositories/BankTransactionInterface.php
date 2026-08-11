<?php

namespace Modules\Banking\Repositories;

use Modules\Banking\Models\BankTransaction;

interface BankTransactionInterface
{
    public function all(?array $filters = []): iterable;

    public function find(int $id): ?BankTransaction;

    public function create(array $data): BankTransaction;

    public function update(int $id, array $data): BankTransaction;

    public function delete(int $id): bool;
}
