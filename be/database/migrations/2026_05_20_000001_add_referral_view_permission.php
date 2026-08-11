<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::firstOrCreate([
            'name'       => 'referral.view',
            'guard_name' => 'api',
        ]);

        Role::query()
            ->where('guard_name', 'api')
            ->whereIn('name', ['admin', 'team-member'])
            ->each(function (Role $role) use ($permission) {
                if (! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            });
    }

    public function down(): void
    {
        $permission = Permission::where('name', 'referral.view')
            ->where('guard_name', 'api')
            ->first();

        if ($permission) {
            $permission->delete();
        }
    }
};
