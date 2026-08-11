<?php

use Illuminate\Support\Facades\Route;
use Modules\Banking\Http\Controllers\API\BankAccountController;
use Modules\Banking\Http\Controllers\API\BankTransactionController;

Route::prefix('v1/admin/banking')->group(function () {
    Route::middleware('auth.verified')->group(function () {
        Route::get('/accounts', [BankAccountController::class, 'index'])->name('banking.accounts.index');
        Route::post('/accounts', [BankAccountController::class, 'store'])->name('banking.accounts.store');
        Route::get('/accounts/{id}', [BankAccountController::class, 'show'])->name('banking.accounts.show');
        Route::put('/accounts/{id}', [BankAccountController::class, 'update'])->name('banking.accounts.update');
        Route::delete('/accounts/{id}', [BankAccountController::class, 'destroy'])->name('banking.accounts.delete');

        Route::get('/transactions', [BankTransactionController::class, 'index'])->name('banking.tx.index');
        Route::get('/transactions/{id}', [BankTransactionController::class, 'show'])->name('banking.tx.show');
        Route::post('/transactions/deposit', [BankTransactionController::class, 'deposit'])->name('banking.tx.deposit');
        Route::post('/transactions/withdraw', [BankTransactionController::class, 'withdraw'])->name('banking.tx.withdraw');
        Route::post('/transactions/{id}/reconcile', [BankTransactionController::class, 'reconcile'])->name('banking.tx.reconcile');
    });
});
