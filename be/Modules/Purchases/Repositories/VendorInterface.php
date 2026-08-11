<?php

namespace Modules\Purchases\Repositories;

use Modules\Purchases\Models\Vendor;

interface VendorInterface
{
    public function all(?array $filters = []): iterable;

    public function find(int $id): ?Vendor;

    public function create(array $data): Vendor;

    public function update(int $id, array $data): Vendor;

    public function delete(int $id): bool;
}
