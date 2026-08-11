<?php

use Illuminate\Support\Facades\Route;
use Modules\User\Http\Controllers\API\AccountController;
use Modules\User\Http\Controllers\API\AuthController;
use Modules\User\Http\Controllers\API\CustomerSupportController;
use Modules\User\Http\Controllers\API\GoogleAuthController;
use Modules\User\Http\Controllers\API\StripeUserController;
use Modules\User\Http\Controllers\API\UserController;
use Modules\User\Http\Controllers\API\UserSubscriptionController;
use Modules\User\Http\Controllers\API\SubscriptionWebHookController;
use Modules\User\Http\Controllers\API\BookWiseReferralController;
use Modules\User\Http\Controllers\API\BookWiseSubscriptionController;
use Modules\User\Http\Controllers\API\PlanEntitlementsController;
use Modules\User\Http\Controllers\API\SubscriptionUsageController;

Route::prefix('v1')->group(function () {

    // Invoice entitlements catalog (features/limits) — billing is on BookWise API
    Route::middleware(['auth:api', 'otp.verified'])->get('plan-entitlements', [PlanEntitlementsController::class, 'index'])
        ->name('plan-entitlements.index');

    Route::post('subscription/platform-push', [BookWiseSubscriptionController::class, 'pushFromBookWise'])
        ->middleware('sync_app_api_key')
        ->name('subscription.platform-push');

    Route::middleware(['auth:api', 'otp.verified'])->prefix('subscription')->name('subscription.')->group(function () {
        Route::post('sync', [BookWiseSubscriptionController::class, 'sync'])->name('sync');
        Route::post('apply-platform-plan', [BookWiseSubscriptionController::class, 'applyPlatformPlan'])->name('apply-platform-plan');
        Route::get('platform-status', [BookWiseSubscriptionController::class, 'status'])->name('platform-status');
        Route::get('usage', [SubscriptionUsageController::class, 'show'])->name('usage');
    });

    // =======================
    // Public Auth Routes (without admin prefix)
    // =======================
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('validate-registration', [AuthController::class, 'validateRegistration'])->name('validateRegistration');
    });

    // Stripe subscription webhooks (no auth)
    Route::post('admin/plans/stripe/webhook', [SubscriptionWebHookController::class, 'handleWebhook'])
        ->name('admin.plans.stripe.webhook');
});

Route::prefix('v1/admin')->group(function () {

    // =======================
    // Auth Routes
    // =======================
    Route::prefix('auth')->name('admin.auth.')->group(function () {
        Route::post('login',              [AuthController::class, 'login'])->name('login');
        Route::post('validate-registration', [AuthController::class, 'validateRegistration'])->name('validateRegistration');
        Route::post('register',           [AuthController::class, 'hostRegister'])->name('hostRegister');
        Route::post('verify-email-otp',   [AuthController::class, 'verifyEmailOtp'])->name('verifyRegisterOtp');
        Route::post('resend-otp',         [AuthController::class, 'resendOtp'])->name('resendOtp');
        Route::get('reset-password-email/{token}', [AuthController::class, 'showResetForm'])->name('reset-password.email');
        Route::post('reset-password',     [AuthController::class, 'reset'])->name('password.reset');
        Route::post('forgot-password',    [AuthController::class, 'forgot'])->name('password.forgot');

        // Logout must work even when the access token is already invalid/expired (client still clears session).
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');

        // ✅ Google OAuth Routes
        Route::get('google/redirect',  [GoogleAuthController::class, 'redirect'])->name('google.redirect');
        Route::get('google/callback',  [GoogleAuthController::class, 'callback'])->name('google.callback');

        // Authenticated routes
        Route::middleware('auth.verified')->group(function () {
            Route::get('me', [AuthController::class, 'me'])->name('me');
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        });
    });

    // =======================
    // User Management Routes
    // =======================
    Route::middleware('auth.verified')->prefix('users')->name('admin.users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');          // List users
        Route::post('validate-fields', [UserController::class, 'validateUserFields'])->name('validateFields');
        Route::post('/', [UserController::class, 'registerUser'])->name('store');  // Create user
        Route::put('change-theme ', [UserController::class, 'updateTheme'])->name('updateTheme');
        Route::post('mark-pricing-seen', [UserController::class, 'markPricingSeen'])->name('markPricingSeen');
        // Static paths must be registered before {id} or Laravel matches e.g. remove-company-logo as an id.
        Route::post('change-company-details', [UserController::class, 'changeCompanyDetails'])->name('changeCompanyDetails');
        Route::delete('remove-company-logo', [UserController::class, 'removeCompanyLogo'])->name('removeCompanyLogo');
        Route::get('{id}', [UserController::class, 'show'])->name('show');             // View user
        Route::put('{id}', [UserController::class, 'update'])->name('update');         // Update user
        Route::put('{id}/deactivate', [UserController::class, 'deactivate'])->name('deactivate'); // Deactivate user
        Route::put('{id}/activate', [UserController::class, 'activate'])->name('activate');     // Activate user
        Route::delete('{id}', [UserController::class, 'destroy'])->defaults('action', 'delete')->name('destroy');         // Delete user
        Route::delete('{id}/{action}', [UserController::class, 'destroy'])->name('destroyWithAction'); // Delete/deactivate with action
    });

    // =======================
    // Account Context Routes
    // =======================
    Route::middleware(['auth:api', 'sync.sso', 'set.spatie.team'])->prefix('account')->name('admin.account.')->group(function () {
        Route::get('mode', [AccountController::class, 'mode'])->name('mode');
        Route::post('switch-mode', [AccountController::class, 'switchMode'])->name('switchMode');
        Route::post('create-company-profile', [AccountController::class, 'createCompanyProfile'])->name('createCompanyProfile');
        Route::get('contexts', [AccountController::class, 'contexts'])->name('contexts');
        Route::post('context/switch', [AccountController::class, 'switchContext'])->name('switchContext');
        Route::post('company/create', [AccountController::class, 'createCompany'])->name('createCompany');
        Route::post('company/toggle-status', [AccountController::class, 'toggleCompanyStatus'])->name('toggleCompanyStatus');
        Route::delete('company/delete', [AccountController::class, 'deleteCompany'])->name('deleteCompany');
    });

    // =======================
    // BookWise referral (proxied — same auth pattern as profile uploads)
    // =======================
    Route::middleware('auth.verified')->prefix('referrals')->name('admin.referrals.')->group(function () {
        Route::get('share-settings', [BookWiseReferralController::class, 'getShareSettings'])
            ->name('share-settings.show');
        Route::post('share-settings', [BookWiseReferralController::class, 'updateShareSettings'])
            ->name('share-settings.update');
    });

    // =======================
    // Customer Support Routes
    // =======================
    Route::middleware('auth.verified')->prefix('customer-support')->name('admin.customer-support.')->group(function () {
        Route::post('/', [CustomerSupportController::class, 'store'])->name('store');
    });

    // =======================
    // Stripe Routes
    // =======================
    Route::prefix('stripe')->group(function () {
        // Browser redirects from Stripe must remain public (no bearer token available).
        Route::get('connect', [StripeUserController::class, 'connect'])
            ->name('stripe.connect');

        // API action remains authenticated.
        Route::post('connect', [StripeUserController::class, 'connect'])
            ->middleware(['auth:api', 'sync.sso', 'set.spatie.team']);

        Route::get('refresh', [StripeUserController::class, 'refresh'])
            ->name('stripe.refresh');

        Route::get('return', [StripeUserController::class, 'return'])
            ->name('stripe.return');

        Route::delete('disconnect', [StripeUserController::class, 'disconnect'])
            ->middleware(['auth:api', 'sync.sso', 'set.spatie.team']);

        Route::delete('disconnect-permanently', [StripeUserController::class, 'disconnectPermanent'])
            ->middleware(['auth:api', 'sync.sso', 'set.spatie.team']);

        Route::get('re-connect', [StripeUserController::class, 'reconnect'])
            ->name('stripe.reconnect');
    });

    // =======================
    // Subscription Routes
    // =======================
    Route::middleware(['auth:api', 'otp.verified'])->prefix('plans')->group(function () {
        Route::get('/', [UserSubscriptionController::class, 'index'])->name('plans.index');
        Route::post('subscribe', [UserSubscriptionController::class, 'store'])->name('plans.subscribe');
        Route::post('save-payment-method', [UserSubscriptionController::class, 'savePaymentMethod'])
            ->name('plans.save-payment-method');
    });
});