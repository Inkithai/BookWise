<?php

use Illuminate\Support\Facades\Route;
use Modules\Analytics\Http\Controllers\API\AnalyticsController;

Route::prefix('v1/admin')->group(function () {
    Route::middleware('auth.verified.basic')->prefix('analytics')->name('admin.analytics.')->group(function () {
        
        // Dashboard overview statistics
        //Route::get('/dashboard', [AnalyticsController::class, 'getDashboard'])->name('dashboard');
        
        // Users list for dropdown
        //Route::get('/users', [AnalyticsController::class, 'getUsersList'])->name('users');
        
        // User-specific analytics
        //Route::get('/user/{userId}', [AnalyticsController::class, 'getUserAnalytics'])->name('user');
    });
});
