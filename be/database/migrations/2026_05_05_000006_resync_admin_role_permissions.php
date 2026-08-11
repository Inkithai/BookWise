<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Re-sync the admin role for super-admin's dedicated host (host_id=5, team_id=6)
 * with ALL current non-system, non-feature permissions so that sub-users assigned
 * the admin role have access to all relevant actions (user.*, custom.*, etc.).
 *
 * feature.* permissions are subscription feature flags managed by the platform;
 * they are NOT granted to host-level admin roles.
 */
return new class extends Migration
{
    public function up(): void
    {
        $adminRole = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->where('host_id', 5)
            ->where('team_id', 6)
            ->first();

        if (!$adminRole) {
            return;
        }

        $permissions = Permission::where('name', 'not like', 'system.%')
            ->where('name', 'not like', 'feature.%')
            ->get();

        $adminRole->syncPermissions($permissions);
    }

    public function down(): void
    {
        // Intentionally empty.
    }
};
