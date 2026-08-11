<?php

namespace Modules\SuperAdmin\Providers;

use Illuminate\Support\ServiceProvider;
use Modules\SuperAdmin\Http\Middleware\SuperAdminMiddleware;

class SuperAdminServiceProvider extends ServiceProvider
{
    /**
     * The module namespace to assume when generating URLs to actions.
     */
    protected string $namespace = 'Modules\SuperAdmin\Http\Controllers';

    /**
     * Boot the application events.
     */
    public function boot(): void
    {
        $this->registerConfig();
        $this->registerViews();
        $this->loadMigrationsFrom(module_path('SuperAdmin', 'database/migrations'));
        $this->registerMiddleware();
    }

    /**
     * Register the service provider.
     */
    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
        
        // Register repositories
        $this->app->bind(
            \Modules\SuperAdmin\Repositories\SuperAdminRepository::class,
            \Modules\SuperAdmin\Repositories\SuperAdminRepository::class
        );
        
        // Register services
        $this->app->bind(
            \Modules\SuperAdmin\Services\SuperAdminService::class,
            \Modules\SuperAdmin\Services\SuperAdminService::class
        );
    }

    /**
     * Register config.
     */
    protected function registerConfig(): void
    {
        $this->publishes([
            module_path('SuperAdmin', 'config/config.php') => config_path('superadmin.php'),
        ], 'superadmin-config');

        $this->mergeConfigFrom(
            module_path('SuperAdmin', 'config/config.php'),
            'superadmin'
        );
    }

    /**
     * Register views.
     */
    public function registerViews(): void
    {
        $viewPath = resource_path('views/modules/superadmin');
        $sourcePath = module_path('SuperAdmin', 'resources/views');

        $this->publishes([
            $sourcePath => $viewPath
        ], ['views', 'superadmin-module-views']);

        $this->loadViewsFrom(array_merge($this->getPublishableViewPaths(), [$sourcePath]), 'superadmin');
    }

    /**
     * Register middleware.
     */
    protected function registerMiddleware(): void
    {
        $this->app['router']->aliasMiddleware('super-admin', SuperAdminMiddleware::class);
    }

    /**
     * Get the services provided by the provider.
     */
    public function provides(): array
    {
        return [];
    }

    /**
     * Get publishable view paths.
     */
    private function getPublishableViewPaths(): array
    {
        $paths = [];
        foreach ($this->app['config']->get('view.paths') as $path) {
            if (is_dir($path . '/modules/superadmin')) {
                $paths[] = $path . '/modules/superadmin';
            }
        }
        return $paths;
    }
}
