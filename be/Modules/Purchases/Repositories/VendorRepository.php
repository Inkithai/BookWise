<?php

namespace Modules\Purchases\Repositories;

use App\Services\TenantManager;
use Modules\Purchases\Models\Vendor;

class VendorRepository implements VendorInterface
{
    public function __construct(private Vendor $model) {}

    public function all(?array $filters = []): iterable
    {
        $query = $this->model->newQuery();

        if (! empty($filters['q'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', '%'.$filters['q'].'%')
                    ->orWhere('email', 'like', '%'.$filters['q'].'%');
            });
        }

        return $query->orderBy('name')->get();
    }

    public function find(int $id): ?Vendor
    {
        return $this->model->newQuery()->with('bills', 'account')->find($id);
    }

    public function create(array $data): Vendor
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function update(int $id, array $data): Vendor
    {
        $vendor = $this->model->newQuery()->findOrFail($id);
        $vendor->update($data);

        return $vendor->fresh();
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
