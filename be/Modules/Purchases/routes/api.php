<?php

use Illuminate\Support\Facades\Route;
use Modules\Purchases\Http\Controllers\API\BillController;
use Modules\Purchases\Http\Controllers\API\VendorController;

Route::prefix('v1/admin/purchases')->group(function () {
    Route::middleware('auth.verified')->group(function () {
        Route::get('/vendors', [VendorController::class, 'index'])->name('purchases.vendors.index');
        Route::post('/vendors', [VendorController::class, 'store'])->name('purchases.vendors.store');
        Route::get('/vendors/{id}', [VendorController::class, 'show'])->name('purchases.vendors.show');
        Route::put('/vendors/{id}', [VendorController::class, 'update'])->name('purchases.vendors.update');
        Route::delete('/vendors/{id}', [VendorController::class, 'destroy'])->name('purchases.vendors.delete');

        Route::get('/bills', [BillController::class, 'index'])->name('purchases.bills.index');
        Route::post('/bills', [BillController::class, 'store'])->name('purchases.bills.store');
        Route::get('/bills/{id}', [BillController::class, 'show'])->name('purchases.bills.show');
        Route::post('/bills/payments', [BillController::class, 'pay'])->name('purchases.bills.pay');
        Route::post('/bills/{id}/void', [BillController::class, 'void'])->name('purchases.bills.void');
        Route::delete('/bills/{id}', [BillController::class, 'destroy'])->name('purchases.bills.delete');
    });
});
