<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        // Create or get the Super Admin user
        $user = User::firstOrCreate(
    ['email' => 'super-host@gmail.com'],
    [
        'name' => 'Super Admin', // ✅ ADD THIS
        'user_name' => 'superadmin',
        'password' => bcrypt('super@123'),
        'account_type' => 'super-admin',
        'first_name' => 'Super',
        'last_name' => 'Admin',
        'is_temp_password' => 0,
        'host_id' => null,
    ]
);
        // Get the global role (no host_id, no team_id)
        $role = Role::where('name', 'super-admin')
            ->whereNull('host_id')
            ->whereNull('team_id')
            ->first();

        // Assign the role if it exists and the user doesn't have it already
        if ($role && !$user->hasRole('super-admin')) {
            // Manually assign the role and set model_type
            $user->roles()->attach($role->id, [
                'model_type' => 'Modules\User\Models\User',  // Explicitly set model_type as User model
                'team_id' => 1
            ]);
        }

        // Optionally, clear cached permissions
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
