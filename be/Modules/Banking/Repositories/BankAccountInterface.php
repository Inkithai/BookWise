<?php

namespace Modules\Banking\Repositories;

use Modules\Banking\Models\BankAccount;

interface BankAccountInterface
{
    public function all(?array $filters = []): iterable;

    public function find(int $id): ?BankAccount;

    public function create(array $data): BankAccount;

    public function update(int $id, array $data): BankAccount;

    public function delete(int $id): bool;
}
