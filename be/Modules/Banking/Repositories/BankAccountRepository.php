<?php

namespace Modules\Banking\Repositories;

use App\Services\TenantManager;
use Modules\Banking\Models\BankAccount;

class BankAccountRepository implements BankAccountInterface
{
    public function __construct(private BankAccount $model) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery()->with('account');

        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }
        if (! empty($filters['account_type'])) {
            $query->where('account_type', $filters['account_type']);
        }

        return $query->orderBy('name')->get();
    }

    public function find(int $id): ?BankAccount
    {
        return $this->model->newQuery()->with('account', 'transactions')->find($id);
    }

    public function create(array $data): BankAccount
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function update(int $id, array $data): BankAccount
    {
        $account = $this->model->newQuery()->findOrFail($id);
        $account->update($data);

        return $account->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
