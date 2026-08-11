<?php

use Illuminate\Support\Facades\Route;
use Modules\GoogleAnalytics\Http\Controllers\API\GoogleAnalyticsController;

Route::prefix('v1/admin')->group(function () {
    Route::middleware('auth.verified.basic')->prefix('google-analytics')->name('admin.google-analytics.')->group(function () {
        
        // Get invoice analytics data
        Route::get('/invoice', [GoogleAnalyticsController::class, 'invoice'])->name('invoice');
        
        // Fetch and store clarity data from API
        Route::post('/fetch-clarity', [GoogleAnalyticsController::class, 'fetchAndStore'])->name('fetch-clarity');
    });
});
