<?php

use Illuminate\Support\Facades\Route;
use Modules\SuperAdminAnalytics\Http\Controllers\AnalyticsDashboardController;
use Modules\SuperAdminAnalytics\Http\Controllers\AnalyticsUsersController;
use Modules\SuperAdminAnalytics\Http\Controllers\AnalyticsClientsController;
use Modules\SuperAdminAnalytics\Http\Controllers\AnalyticsInvoicesController;
use Modules\SuperAdminAnalytics\Http\Controllers\AnalyticsActivityController;

Route::prefix('analytics')
    ->middleware(['auth:api'])
    ->group(function () {

        // ── Dashboard ────────────────────────────────────────────────────────
        Route::get('dashboard', [AnalyticsDashboardController::class, 'index']);

        // ── Users ────────────────────────────────────────────────────────────
        Route::get('users',           [AnalyticsUsersController::class, 'index']);
        Route::get('users/dropdown',  [AnalyticsUsersController::class, 'dropdown']);
        Route::get('users/{id}',      [AnalyticsUsersController::class, 'show']);
        Route::put('users/{id}/activate',   [AnalyticsUsersController::class, 'activate']);
        Route::put('users/{id}/deactivate', [AnalyticsUsersController::class, 'deactivate']);
        Route::delete('users/{id}',         [AnalyticsUsersController::class, 'destroy']);
        Route::post('users',          [AnalyticsUsersController::class, 'store']);
        Route::put('users/{id}',      [AnalyticsUsersController::class, 'update']);

        // ── Clients ──────────────────────────────────────────────────────────
        Route::get('clients', [AnalyticsClientsController::class, 'index']);

        // ── Invoices ─────────────────────────────────────────────────────────
        Route::get('invoices', [AnalyticsInvoicesController::class, 'index']);

        // ── Activity Logs ────────────────────────────────────────────────────
        Route::get('activity-logs', [AnalyticsActivityController::class, 'index']);
    });
