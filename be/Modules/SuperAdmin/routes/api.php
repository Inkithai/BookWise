<?php

use Illuminate\Support\Facades\Route;
use Modules\SuperAdmin\Http\Controllers\API\PlanManagementController;
use Modules\SuperAdmin\Http\Controllers\API\SuperAdminAnalyticsController;
use Modules\SuperAdmin\Http\Middleware\SuperAdminMiddleware;

/*
|--------------------------------------------------------------------------
| Super Admin API Routes
|--------------------------------------------------------------------------
|
| These routes are only accessible to users with 'super-admin' role
| All routes are protected by SuperAdminMiddleware
|
*/

Route::prefix('v1/super-admin')->middleware(['auth.verified', SuperAdminMiddleware::class])->group(function () {
    
    // Analytics Routes
    Route::prefix('analytics')->name('super-admin.analytics.')->group(function () {
        
        // Dashboard Statistics
        Route::get('stats', [SuperAdminAnalyticsController::class, 'getDashboardStats'])
            ->name('stats');

        Route::get('subscription-finance', [SuperAdminAnalyticsController::class, 'getSubscriptionFinance'])
            ->name('subscription-finance');

        Route::get('subscription-finance/hosts', [SuperAdminAnalyticsController::class, 'getSubscriptionFinanceHosts'])
            ->name('subscription-finance.hosts');
        
        // Filter Options
        Route::get('filter-options', [SuperAdminAnalyticsController::class, 'getFilterOptions'])
            ->name('filter-options');

        // Plan management
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/', [PlanManagementController::class, 'index'])->name('index');
            Route::get('dashboard', [PlanManagementController::class, 'dashboard'])->name('dashboard');
            Route::get('platform', [PlanManagementController::class, 'listPlatformPlans'])->name('platform.index');
            Route::post('/', [PlanManagementController::class, 'store'])->name('store');
            Route::put('entitlements/{slug}', [PlanManagementController::class, 'updateEntitlements'])->name('entitlements.update');
            Route::patch('visibility/invoice/{slug}', [PlanManagementController::class, 'updateInvoiceVisibility'])->name('visibility.invoice');
            Route::patch('visibility/platform/{platformPlanId}', [PlanManagementController::class, 'updatePlatformVisibility'])->name('visibility.platform')->whereNumber('platformPlanId');
            Route::get('{id}', [PlanManagementController::class, 'show'])->name('show')->whereNumber('id');
            Route::put('{id}', [PlanManagementController::class, 'update'])->name('update')->whereNumber('id');
            Route::delete('{id}', [PlanManagementController::class, 'destroy'])->name('destroy')->whereNumber('id');
        });
        
        // User Management
        Route::prefix('users')->name('users.')->group(function () {
            // List all users with filters
            Route::get('/', [SuperAdminAnalyticsController::class, 'getAllUsers'])
                ->name('index');
            
            // Get single user details
            Route::get('{userId}', [SuperAdminAnalyticsController::class, 'getUserDetails'])
                ->name('show');
            
            // Activate user
            Route::put('{userId}/activate', [SuperAdminAnalyticsController::class, 'activateUser'])
                ->name('activate');
            
            // Deactivate user
            Route::put('{userId}/deactivate', [SuperAdminAnalyticsController::class, 'deactivateUser'])
                ->name('deactivate');
            
            // Delete user (soft delete)
            Route::delete('{userId}', [SuperAdminAnalyticsController::class, 'deleteUser'])
                ->name('delete');

            // Assign VIP (complimentary full access, no billing emails)
            Route::put('{userId}/assign-vip', [SuperAdminAnalyticsController::class, 'assignUserVipPlan'])
                ->name('assign-vip');
        });
    });
});
