<?php

namespace App\Providers;

use Carbon\Carbon;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\ServiceProvider;
use App\Mixins\DateMixin;
use App\Mixins\BuilderMixin;
use Illuminate\Database\Eloquent\Builder;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        Carbon::mixin(new DateMixin());
        Builder::mixin(new BuilderMixin());
        
        $this->app->bind(
            \Laravel\Passport\Bridge\AccessTokenRepository::class,
            \App\Repositories\CustomAccessTokenRepository::class
        );

        $this->app->bind(
            \Laravel\Passport\ClientRepository::class,
            \App\Repositories\CustomClientRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Auth::provider('eloquent', function ($app, array $config) {
            return new \App\Providers\CustomUserProvider($app['hash'], $config['model']);
        });

        // Error response macro
        Response::macro('error', function (string $message, int $code = 400, $errors = null) {
            return response()->json([
                'error' => true,
                'message' => $message,
                'code' => $code,
                'errors' => $errors ?? [],
                'timestamp' => now()->toIso8601String(),
            ], $code);
        });

        // Success response macro
        Response::macro('success', function ($data = null, string $message = 'Success', int $code = 200) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'code' => $code,
                'data' => $data,
                'timestamp' => now()->toIso8601String(),
            ], $code);
        });
    }
}
