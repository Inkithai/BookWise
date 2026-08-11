<?php

namespace Modules\SuperAdminAnalytics\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class SuperAdminAnalyticsServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'SuperAdminAnalytics';
    protected string $moduleNameLower = 'superadminanalytics';

    public function boot(): void
    {
        $this->registerRoutes();
        $this->loadMigrationsFrom(module_path($this->moduleName, 'Database/migrations'));
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }

    protected function registerRoutes(): void
    {
        Route::prefix('api')
            ->middleware('api')
            ->group(module_path($this->moduleName, 'routes/api.php'));
    }
}
