<?php

use Illuminate\Support\Facades\Route;
use Modules\AdminAnalytics\app\Http\Controllers\AdminAnalyticsController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('adminanalytics', AdminAnalyticsController::class)->names('adminanalytics');
});
