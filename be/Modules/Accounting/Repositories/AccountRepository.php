<?php

namespace Modules\Accounting\Repositories;

use App\Services\TenantManager;
use Modules\Accounting\Models\Account;

class AccountRepository implements AccountInterface
{
    public function __construct(private Account $model) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery();

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (isset($filters['is_active'])) {
            $query->where('is_active', (bool) $filters['is_active']);
        }
        if (! empty($filters['q'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%'.$filters['q'].'%')
                    ->orWhere('code', 'like', '%'.$filters['q'].'%');
            });
        }

        return $query->orderBy('code')->get();
    }

    public function tree(): array
    {
        $accounts = $this->model->newQuery()->orderBy('code')->get();
        $byParent = $accounts->groupBy('parent_id');

        $build = function (int|null $parentId) use (&$build, $byParent): array {
            return collect($byParent->get($parentId, []))->map(function (Account $account) use (&$build) {
                $array = $account->toArray();
                $array['children'] = $build($account->id);

                return $array;
            })->values()->all();
        };

        return $build(null);
    }

    public function find(int $id): ?Account
    {
        return $this->model->newQuery()->with('parent', 'children')->find($id);
    }

    public function findByCode(string $code): ?Account
    {
        $hostId = TenantManager::id();

        return $this->model->newQuery()
            ->where('host_id', $hostId)
            ->where('code', $code)
            ->first();
    }

    public function create(array $data): Account
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function update(int $id, array $data): Account
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
