<?php

use Illuminate\Support\Facades\Route;
use Modules\Expenses\Http\Controllers\API\ExpenseController;

Route::prefix('v1/admin/expenses')->group(function () {
    Route::middleware('auth.verified')->group(function () {
        Route::get('/categories', [ExpenseController::class, 'categories'])->name('expenses.categories.index');
        Route::post('/categories', [ExpenseController::class, 'storeCategory'])->name('expenses.categories.store');

        Route::get('/', [ExpenseController::class, 'index'])->name('expenses.index');
        Route::post('/', [ExpenseController::class, 'store'])->name('expenses.store');
        Route::get('/{id}', [ExpenseController::class, 'show'])->name('expenses.show');
        Route::delete('/{id}', [ExpenseController::class, 'destroy'])->name('expenses.delete');
    });
});
