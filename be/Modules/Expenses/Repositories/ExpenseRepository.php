<?php

namespace Modules\Expenses\Repositories;

use App\Services\TenantManager;
use Modules\Expenses\Models\Expense;
use Modules\Expenses\Models\ExpenseCategory;

class ExpenseRepository implements ExpenseInterface
{
    public function __construct(
        private Expense $model,
        private ExpenseCategory $categoryModel
    ) {}

    public function allCategories(?array $filters = []): iterable
    {
        return $this->categoryModel->newQuery()->orderBy('name')->get();
    }

    public function allExpenses(?array $filters = []): iterable
    {
        $query = $this->model->newQuery()->with('category', 'account', 'vendor', 'bankAccount');

        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }
        if (! empty($filters['from'])) {
            $query->whereDate('date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->whereDate('date', '<=', $filters['to']);
        }

        return $query->orderByDesc('date')->get();
    }

    public function findExpense(int $id): ?Expense
    {
        return $this->model->newQuery()->with('category', 'account', 'vendor', 'bankAccount', 'journalEntry')->find($id);
    }

    public function createCategory(array $data): ExpenseCategory
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->categoryModel->newQuery()->create($data);
    }

    public function create(array $data): Expense
    {
        if (empty($data['host_id'])) {
            $data['host_id'] = TenantManager::id();
        }

        return $this->model->newQuery()->create($data);
    }

    public function delete(int $id): bool
    {
        return (bool) $this->model->newQuery()->findOrFail($id)->delete();
    }
}
