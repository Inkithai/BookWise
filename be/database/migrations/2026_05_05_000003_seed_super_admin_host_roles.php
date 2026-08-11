<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Create default admin + team-member roles scoped to the super-admin's
 * dedicated host (id=5) and team (id=6), then grant all non-system
 * permissions to the admin role — identical to what ensureCompanyRolesAndPermissions()
 * does for every other company host.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sa = DB::table('users')->where('account_type', 'super-admin')->orderBy('id')->first();
        if (!$sa) {
            return;
        }

        $hostId = (int) $sa->host_id;
        if ($hostId <= 0) {
            return;
        }

        $team = DB::table('teams')->where('host_id', $hostId)->first();
        if (!$team) {
            return;
        }
        $teamId = (int) $team->id;

        // ── Create admin and team-member roles scoped to super-admin's host/team ─
        foreach (['admin', 'team-member'] as $roleName) {
            Role::firstOrCreate(
                [
                    'name'       => $roleName,
                    'guard_name' => 'api',
                    'host_id'    => $hostId,
                    'team_id'    => $teamId,
                ]
            );
        }

        // ── Grant all non-system permissions to the admin role ──────────────────
        $adminRole = Role::where('name', 'admin')
            ->where('guard_name', 'api')
            ->where('host_id', $hostId)
            ->where('team_id', $teamId)
            ->first();

        if ($adminRole) {
            $excludedIds = Permission::where('name', 'like', 'system.%')->pluck('id');
            $permissions = Permission::whereNotIn('id', $excludedIds)->get();
            $adminRole->syncPermissions($permissions);
        }
    }

    public function down(): void
    {
        // Intentionally empty.
    }
};
