<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

use App\Policies\CustomPolicy;
use App\Policies\InvoiceClientPolicy;
use App\Policies\InvoicePolicy;
use App\Policies\PermissionPolicy;
use App\Policies\ReceiptPolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use Modules\CustomCRM\Models\CustomTable;
use Modules\Invoice\Models\Invoice;
use Modules\Invoice\Models\InvoiceClient;
use Modules\Invoice\Models\Receipt;
use Modules\User\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        User::class => UserPolicy::class,
        Invoice::class => InvoicePolicy::class,
        InvoiceClient::class => InvoiceClientPolicy::class,
        Receipt::class => ReceiptPolicy::class,
        CustomTable::class => CustomPolicy::class,
        Role::class => RolePolicy::class,
        Permission::class => PermissionPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     *
     * @return void
     */
    public function boot(): void
    {
        $this->registerPolicies();

        \Illuminate\Support\Facades\Auth::provider('sso_eloquent', function ($app, array $config) {
            return new \App\Providers\CustomUserProvider($app['hash'], $config['model']);
        });

        // Allow super-admin and admin (account owners) for all abilities before
        // Spatie's policy layer runs. Uses direct DB check so it works regardless
        // of Spatie team scope, User model type, or role_has_permissions gaps.
        Gate::before(function ($user, $ability) {
            if ($user === null) {
                return null;
            }
            $pivotTable = config('permission.table_names.model_has_roles', 'model_has_roles');
            $rolesTable = config('permission.table_names.roles', 'roles');
            $modelTypes = array_values(array_unique(array_filter([
                get_class($user),
                'Modules\User\Models\User',
                'App\Models\User',
            ])));
            $roleName = DB::table($pivotTable)
                ->join($rolesTable, "{$rolesTable}.id", '=', "{$pivotTable}.role_id")
                ->where("{$pivotTable}.model_id", $user->getKey())
                ->whereIn("{$pivotTable}.model_type", $modelTypes)
                ->whereIn("{$rolesTable}.name", ['super-admin', 'admin'])
                ->orderByRaw("CASE {$rolesTable}.name WHEN 'super-admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END")
                ->value("{$rolesTable}.name");

            // super-admin and admin role users bypass all policy checks — they have
            // full access within their tenant. team-member / custom roles fall through
            // to individual policy methods which check specific permissions.
            if (in_array($roleName, ['super-admin', 'admin'], true)) {
                return true;
            }
            return null;
        });
    }

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            \Laravel\Passport\Bridge\AccessTokenRepository::class,
            \App\Repositories\CustomAccessTokenRepository::class
        );
    }
}
