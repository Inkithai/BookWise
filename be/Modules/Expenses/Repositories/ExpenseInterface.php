<?php

namespace Modules\Expenses\Repositories;

use Modules\Expenses\Models\Expense;
use Modules\Expenses\Models\ExpenseCategory;

interface ExpenseInterface
{
    public function allCategories(?array $filters = []): iterable;

    public function allExpenses(?array $filters = []): iterable;

    public function findExpense(int $id): ?Expense;

    public function createCategory(array $data): ExpenseCategory;

    public function create(array $data): Expense;

    public function delete(int $id): bool;
}
