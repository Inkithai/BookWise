<?php

use Illuminate\Support\Facades\Route;
use Modules\SuperAdminAnalytics\Http\Controllers\SuperAdminAnalyticsController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('superadminanalytics', SuperAdminAnalyticsController::class)->names('superadminanalytics');
});
