<?php

namespace Modules\Purchases\Repositories;

use Modules\Purchases\Models\Bill;

interface BillInterface
{
    public function all(?array $filters = []): iterable;

    public function find(int $id): ?Bill;

    public function create(array $data): Bill;

    public function createItems(Bill $bill, array $items): void;

    public function update(int $id, array $data): Bill;

    public function delete(int $id): bool;
}
