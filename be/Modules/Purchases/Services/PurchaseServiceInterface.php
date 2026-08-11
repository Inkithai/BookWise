<?php

namespace Modules\Purchases\Services;

use Modules\Purchases\Models\Bill;
use Modules\Purchases\Models\BillPayment;
use Modules\Purchases\Models\Vendor;

interface PurchaseServiceInterface
{
    public function createVendor(array $data, ?int $userId = null): Vendor;

    public function createBill(array $data, ?int $userId = null): Bill;

    public function recordPayment(int $billId, array $data, ?int $userId = null): BillPayment;

    public function voidBill(int $billId): Bill;
}
