<?php

use Illuminate\Support\Facades\Route;
use Modules\CustomCRM\Http\Controllers\API\CustomTableController;
use Modules\CustomCRM\Models\CustomTable;

Route::prefix('v1/admin')->group(function () {
    // Custom CRM Management Routes (protected)
    Route::middleware(['auth:api', 'otp.verified', 'sync.sso', 'set.spatie.team', 'plan.feature:crm'])->prefix('custom-crm')->name('admin.custom-crm.')->group(function () {
        Route::get('/', [CustomTableController::class, 'index'])->name('index'); // ->middleware('can:view,' . CustomTable::class);
        Route::post('/store', [CustomTableController::class, 'store'])->name('store');
        Route::put('/update/{tableId}/attributes', [CustomTableController::class, 'updateCustomTableRecords'])
            ->name('update.attributes');
        Route::delete('/delete/{tableId}', [CustomTableController::class, 'deleteCustomTable'])
            ->name('custom-crm.delete');

        Route::post('/upload-csv', [CustomTableController::class, 'uploadCsv'])->name('uploadCsv');

        Route::get('/custom-tables/{tableId}/attributes', [CustomTableController::class, 'getCustomTableAttributes'])
            ->name('custom-tables.attributes');

        // Get records from a custom table
        Route::get('/custom-tables/{table_id}/attributes/records', [CustomTableController::class, 'getCustomTableRecords'])
            ->name('custom-tables.attributes.records');
        Route::post('/custom-tables/{table_id}/records/store', [CustomTableController::class, 'storeCustomTableRecord'])
            ->name('custom-tables.records.store');

        // crm lead status
        Route::get('/crm-leads-status', [CustomTableController::class, 'leadStatus'])
            ->name('crm-leads-status');
        Route::post('/crm-leads-status/store', [CustomTableController::class, 'SaveLeadStatus'])
            ->name('crm-leads-status.store');

        // lead user list
        Route::get('/lead-users', [CustomTableController::class, 'getLeadRelatedUsers'])
            ->name('lead-users');
    });
});
