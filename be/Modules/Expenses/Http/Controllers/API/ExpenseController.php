<?php

namespace Modules\Expenses\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Expenses\Http\Requests\StoreExpenseCategoryRequest;
use Modules\Expenses\Http\Requests\StoreExpenseRequest;
use Modules\Expenses\Http\Resources\ExpenseCategoryResource;
use Modules\Expenses\Http\Resources\ExpenseResource;
use Modules\Expenses\Repositories\ExpenseInterface;
use Modules\Expenses\Services\ExpenseServiceInterface;

class ExpenseController extends Controller
{
    public function __construct(
        private ExpenseInterface $expenses,
        private ExpenseServiceInterface $service
    ) {}

    public function categories(Request $request)
    {
        return response()->success(
            ExpenseCategoryResource::collection($this->expenses->allCategories($request->all())),
            'Expense categories'
        );
    }

    public function storeCategory(StoreExpenseCategoryRequest $request)
    {
        $category = $this->expenses->createCategory($request->validated());

        return response()->success(new ExpenseCategoryResource($category), 'Expense category created', 201);
    }

    public function index(Request $request)
    {
        return response()->success(
            ExpenseResource::collection($this->expenses->allExpenses($request->all())),
            'Expenses'
        );
    }

    public function store(StoreExpenseRequest $request)
    {
        $expense = $this->service->createExpense($request->validated(), (int) request()->user()->id);

        return response()->success(new ExpenseResource($expense), 'Expense recorded', 201);
    }

    public function show($id)
    {
        $expense = $this->expenses->findExpense((int) $id);
        abort_if(empty($expense), 404, 'Expense not found');

        return response()->success(new ExpenseResource($expense), 'Expense');
    }

    public function destroy($id)
    {
        $this->expenses->delete((int) $id);

        return response()->success(null, 'Expense deleted');
    }
}
