<?php

use Illuminate\Support\Facades\Route;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsController;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsInvoicesController;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsClientsController;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsUsersController;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsActivityLogController;
use Modules\AdminAnalytics\app\Http\Controllers\AnalyticsDiagnosticController;

/*
 * RouteServiceProvider mounts this file with: middleware('api'), prefix('api'), name('api.')
 * Final URLs: /api/v1/admin/analytics/...
 *
 * ✅ Route NAMES use 'admin-analytics.' prefix (not 'admin.analytics.')
 *    to avoid collision with the old Modules\Analytics module which
 *    already owns: api.admin.analytics.dashboard / .users / .user
 *
 * The URL paths are UNCHANGED — only the internal route names differ.
 */

// Temporary diagnostic (no auth) — remove once confirmed working
Route::get('v1/admin/analytics/debug', [AnalyticsDiagnosticController::class, 'run']);

Route::prefix('v1/admin/analytics')
    ->middleware('auth.verified.basic')
    ->name('admin-analytics.')
    ->group(function () {

        // GET /api/v1/admin/analytics/dashboard
        Route::get('dashboard',     [AnalyticsController::class, 'getDashboard'])->name('dashboard');

        // GET /api/v1/admin/analytics/users
        Route::get('users',         [AnalyticsController::class, 'getUsersList'])->name('users');

        // GET /api/v1/admin/analytics/user/{userId}
        Route::get('user/{userId}', [AnalyticsController::class, 'getUserAnalytics'])->name('user');

        // GET /api/v1/admin/analytics/invoices
        Route::get('invoices',      [AnalyticsInvoicesController::class, 'index'])->name('invoices');

        // GET /api/v1/admin/analytics/clients
        Route::get('clients',       [AnalyticsClientsController::class, 'index'])->name('clients');

        // GET /api/v1/admin/analytics/users-list
        Route::get('users-list',    [AnalyticsUsersController::class, 'index'])->name('users-list');

        // GET /api/v1/admin/analytics/activity-logs
        Route::get('activity-logs', [AnalyticsActivityLogController::class, 'index'])->name('activity-logs');
    });