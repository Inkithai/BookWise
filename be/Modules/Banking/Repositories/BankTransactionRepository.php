<?php

namespace Modules\Banking\Repositories;

use App\Services\TenantManager;
use Modules\Banking\Models\BankTransaction;

class BankTransactionRepository implements BankTransactionInterface
{
    public function __construct(private BankTransaction $model) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery()->with('bankAccount', 'journalEntry');

        if (! empty($filters['bank_account_id'])) {
            $query->where('bank_account_id', $filters['bank_account_id']);
        }
        if (isset($filters['reconciled'])) {
            $query->where('reconciled', (bool) $filters['reconciled']);
        }
        if (! empty($filters['from'])) {
            $query->whereDate('date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('date', '<=', $filters['to']);
        }

        return $query->orderByDesc('date')->get();
    }

    public function find(int $id): ?BankTransaction
    {
        return $this->model->newQuery()->with('bankAccount', 'journalEntry')->find($id);
    }

    public function create(array $data): BankTransaction
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function update(int $id, array $data): BankTransaction
    {
        $txn = $this->model->newQuery()->findOrFail($id);
        $txn->update($data);

        return $txn->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
