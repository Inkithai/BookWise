<?php

namespace Modules\Expenses\Services;

use Modules\Expenses\Models\Expense;
use Modules\Expenses\Models\ExpenseCategory;

interface ExpenseServiceInterface
{
    public function createCategory(array $data, ?int $userId = null): ExpenseCategory;

    public function createExpense(array $data, ?int $userId = null): Expense;
}
