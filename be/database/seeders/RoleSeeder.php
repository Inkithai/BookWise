<?php

namespace Database\Seeders;

use App\Models\Host;
use App\Models\Team;
use App\Support\TenantRole;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;

class RoleSeeder extends Seeder
{
    public function run()
    {
        // === Global Roles (no host_id or team_id) ===
        $globalRoles = ['super-admin'];

        foreach ($globalRoles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'api',
                'host_id' => null,  // No host for global role
                'team_id' => null,  // No team for global role
            ]);
        }

        // === Define Hosts and Roles ===
        $hosts = [
            'Acme Ltd'
        ];

        $tenantRoles = [
            'admin',
            'team-member',
        ];

        $teamNames = ['Team A'];  // You could expand this dynamically if needed

        foreach ($hosts as $hostName) {
            // Ensure each host exists or is created
            $host = Host::firstOrCreate([
                'name' => $hostName,
            ]);

            foreach ($teamNames as $teamName) {
                // Normalize team name (capitalize and trim spaces)
                $cleanTeamName = Str::title(trim($teamName));

                // Ensure each team for the host exists or is created
                $team = Team::firstOrCreate([
                    'host_id' => $host->id,
                    'name' => $cleanTeamName,
                ]);

                // Create roles for the host and team
                foreach ($tenantRoles as $roleName) {
                    TenantRole::firstOrCreateScoped(
                        $roleName,
                        'api',
                        (int) $host->id,
                        (int) $team->id
                    );
                }
            }
        }
    }
}
