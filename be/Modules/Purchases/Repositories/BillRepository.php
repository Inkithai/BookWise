<?php

namespace Modules\Purchases\Repositories;

use App\Services\TenantManager;
use Modules\Purchases\Models\Bill;
use Modules\Purchases\Models\BillItem;

class BillRepository implements BillInterface
{
    public function __construct(
        private Bill $model,
        private BillItem $itemModel
    ) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery()->with('vendor', 'items', 'payments');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['vendor_id'])) {
            $query->where('vendor_id', $filters['vendor_id']);
        }
        if (! empty($filters['from'])) {
            $query->whereDate('bill_date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('bill_date', '<=', $filters['to']);
        }

        return $query->orderByDesc('bill_date')->get();
    }

    public function find(int $id): ?Bill
    {
        return $this->model->newQuery()->with('vendor', 'items', 'payments', 'journalEntry')->find($id);
    }

    public function create(array $data): Bill
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function createItems(Bill $bill, array $items): void
    {
        foreach ($items as $item) {
            $this->itemModel->newQuery()->create([
                'host_id' => $bill->host_id,
                'bill_id' => $bill->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'] ?? 1,
                'unit_price' => $item['unit_price'] ?? 0,
                'tax_rate' => $item['tax_rate'] ?? 0,
                'amount' => $item['amount'] ?? 0,
                'account_id' => $item['account_id'] ?? null,
            ]);
        }
    }

    public function update(int $id, array $data): Bill
    {
        $bill = $this->model->newQuery()->findOrFail($id);
        $bill->update($data);

        return $bill->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
