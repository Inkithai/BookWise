<?php

use Illuminate\Support\Facades\Route;
use Modules\Accounting\Http\Controllers\API\ChartOfAccountsController;
use Modules\Accounting\Http\Controllers\API\JournalEntryController;
use Modules\Accounting\Http\Controllers\API\ReportController;

Route::prefix('v1/admin/accounting')->group(function () {
    Route::middleware('auth.verified')->group(function () {
        // Chart of Accounts
        Route::get('/chart-of-accounts', [ChartOfAccountsController::class, 'index'])->name('accounting.coa.index');
        Route::post('/chart-of-accounts/seed-system', [ChartOfAccountsController::class, 'seedSystem'])->name('accounting.coa.seed');
        Route::post('/chart-of-accounts', [ChartOfAccountsController::class, 'store'])->name('accounting.coa.store');
        Route::get('/chart-of-accounts/{id}', [ChartOfAccountsController::class, 'show'])->name('accounting.coa.show');
        Route::put('/chart-of-accounts/{id}', [ChartOfAccountsController::class, 'update'])->name('accounting.coa.update');
        Route::delete('/chart-of-accounts/{id}', [ChartOfAccountsController::class, 'destroy'])->name('accounting.coa.delete');

        // Journal Entries (general ledger postings)
        Route::get('/journal-entries', [JournalEntryController::class, 'index'])->name('accounting.je.index');
        Route::post('/journal-entries', [JournalEntryController::class, 'store'])->name('accounting.je.store');
        Route::get('/journal-entries/{id}', [JournalEntryController::class, 'show'])->name('accounting.je.show');
        Route::put('/journal-entries/{id}', [JournalEntryController::class, 'update'])->name('accounting.je.update');
        Route::post('/journal-entries/{id}/post', [JournalEntryController::class, 'post'])->name('accounting.je.post');
        Route::post('/journal-entries/{id}/reverse', [JournalEntryController::class, 'reverse'])->name('accounting.je.reverse');
        Route::delete('/journal-entries/{id}', [JournalEntryController::class, 'destroy'])->name('accounting.je.delete');

        // Financial statements
        Route::get('/reports/trial-balance', [ReportController::class, 'trialBalance'])->name('accounting.reports.tb');
        Route::get('/reports/profit-loss', [ReportController::class, 'profitLoss'])->name('accounting.reports.pnl');
        Route::get('/reports/balance-sheet', [ReportController::class, 'balanceSheet'])->name('accounting.reports.bs');
        Route::get('/reports/cash-flow', [ReportController::class, 'cashFlow'])->name('accounting.reports.cf');
    });
});
