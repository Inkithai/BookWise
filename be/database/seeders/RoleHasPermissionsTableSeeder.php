<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleHasPermissionsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Grant all permissions to global 'super-admin' role
        $role = Role::where('name', 'super-admin')->whereNull('host_id')->whereNull('team_id')->first();

        if ($role) {
            $permissions = Permission::pluck('id')->toArray();

            // Syncing without team context since this is a global role
            $role->syncPermissions($permissions);
        }

        // OPTIONAL: Assign permissions to host-specific roles (with team_id)
        $roles = Role::whereNotNull('host_id')->whereNotNull('team_id')->get();

        foreach ($roles as $tenantRole) {
            // Customize which permissions each tenant role gets
            // For example, only give 'admin' roles all permissions
            if (in_array($tenantRole->name, ['admin'])) {
                $permissions = Permission::pluck('id')->toArray();

                // Sync with team context (Spatie will detect `team_id`)
                $tenantRole->syncPermissions($permissions);
            }
        }
    }
}
