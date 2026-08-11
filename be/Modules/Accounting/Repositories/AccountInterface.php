<?php

namespace Modules\Accounting\Repositories;

use Modules\Accounting\Models\Account;

interface AccountInterface
{
    public function all(?array $filters = []): iterable;

    public function tree(): array;

    public function find(int $id): ?Account;

    public function findByCode(string $code): ?Account;

    public function create(array $data): Account;

    public function update(int $id, array $data): Account;

    public function delete(int $id): bool;
}
