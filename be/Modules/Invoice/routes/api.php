<?php

use Illuminate\Support\Facades\Route;
use Modules\Invoice\Http\Controllers\API\InvoiceStripeWebHookController;
use Modules\Invoice\Http\Controllers\API\InvoiceController;
use Modules\Invoice\Http\Controllers\API\RecurringStatementController;

// Public test route completely outside middleware groups
Route::get('/v1/public/test-clients', [InvoiceController::class, 'getClients'])->name('public.test-clients');
Route::get('/v1/public/test-address-fields', [InvoiceController::class, 'testAddressFields'])->name('public.test-address-fields');

Route::prefix('v1/admin')->group(function () {
    Route::middleware('auth.verified')->prefix('invoices')->name('admin.invoices.')->group(function () {
        Route::get('/', [InvoiceController::class, 'index'])->name('index');

        Route::get('/get-types', [InvoiceController::class, 'getTypes'])->name('get-types');
        Route::get('/get-data', [InvoiceController::class, 'getData'])->name('get-data');

        Route::get('/get-clients', [InvoiceController::class, 'getClients'])->name('get-clients');
        Route::post('/clients/store', [InvoiceController::class, 'storeInvoiceClient'])->name('clients.store');
        Route::put('/clients/update/{id}', [InvoiceController::class, 'updateInvoiceClient'])->name('clients.update');
        Route::delete('/clients/delete/{id}', [InvoiceController::class, 'destroyInvoiceClient'])->name('clients.delete');
        Route::get('/clients/show/{id}', [InvoiceController::class, 'showInvoiceClient'])->name('clients.show'); // keep at the bottom

        Route::post('/store', [InvoiceController::class, 'store'])->name('store');
        Route::post('/save-draft/{id?}', [InvoiceController::class, 'saveDraft'])->name('saveDraft');
        Route::put('/update/{id}', [InvoiceController::class, 'update'])->name('update');
        Route::delete('/delete/{id}', [InvoiceController::class, 'destroy'])->name('delete');
        Route::get('/show/{id}', [InvoiceController::class, 'show'])->name('show'); // keep at the bottom

        Route::post('/send-email', [InvoiceController::class, 'sendMail'])->name('send-email');
        Route::get('/{id}/pdf', [InvoiceController::class, 'generatePDF'])->name('pdf');
        Route::get('/{id}/receipt', [InvoiceController::class, 'generateReceipt'])->name('receipt');
        Route::post('/preview', [InvoiceController::class, 'previewPDF'])->name('preview');

        Route::middleware('plan.feature:recurring_statements')->prefix('recurring-statements')->name('recurring-statements.')->group(function () {
            Route::get('/', [RecurringStatementController::class, 'index'])->name('index');
            Route::post('/', [RecurringStatementController::class, 'store'])->name('store');
            Route::put('/{id}', [RecurringStatementController::class, 'update'])->name('update');
            Route::delete('/{id}', [RecurringStatementController::class, 'destroy'])->name('destroy');
        });

        // 2/23/26
        Route::post('/stripe/webhook', [InvoiceStripeWebHookController::class, 'handle'])->withoutMiddleware('auth:api');
    });
});
