<?php

use Illuminate\Foundation\Application;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'sync_app_api_key' => \App\Http\Middleware\RequireBookWiseApiKey::class,
            'sync.sso' => \App\Http\Middleware\SyncOAuth2User::class,
            'set.spatie.team' => \App\Http\Middleware\SetSpatieTeamFromUser::class,
            'otp.verified' => \App\Http\Middleware\EnsureOtpVerified::class,
            'plan.feature' => \App\Http\Middleware\EnsurePlanFeature::class,
            'tenant' => \App\Http\Middleware\ResolveTenant::class,
        ]);

        // Create centralized auth.verified middleware group
        // This prevents future developers from forgetting otp.verified on new routes
        $middleware->group('auth.verified', [
            'auth:api',
            'otp.verified',
            'sync.sso',
            'set.spatie.team',
            'tenant',
        ]);
        
        // Lightweight auth group (for routes that don't need SSO sync)
        $middleware->group('auth.verified.basic', [
            'auth:api',
            'otp.verified',
        ]);
    })
     ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });
    })->create();
