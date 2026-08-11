<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use RuntimeException;

/**
 * Roles are unique on (team_id, name, guard_name). host_id must not be part of the lookup.
 *
 * Uses INSERT IGNORE so concurrent SSO requests never surface as 1062, then reloads the row.
 * Avoids Spatie Role::create() / Eloquent save quirks with team-scoped duplicates.
 */
class TenantRole
{
    public static function firstOrCreateScoped(string $name, string $guardName, ?int $hostId, ?int $teamId): Role
    {
        $table = config('permission.table_names.roles', 'roles');

        $find = static function () use ($name, $guardName, $teamId): ?Role {
            $query = Role::query()
                ->where('name', $name)
                ->where('guard_name', $guardName);

            if ($teamId !== null) {
                $query->where('team_id', $teamId);
            } else {
                $query->whereNull('team_id');
            }

            return $query->first();
        };

        $role = $find();
        if ($role) {
            static::syncHostIdOnRole($role, $hostId);

            return $role;
        }

        $now = now();
        $row = [
            'name' => $name,
            'guard_name' => $guardName,
            'host_id' => $hostId,
            'team_id' => $teamId,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        DB::table($table)->insertOrIgnore($row);

        $role = $find();
        if (! $role) {
            $teamLabel = $teamId === null ? 'null' : (string) $teamId;
            throw new RuntimeException(
                "Could not load role [{$name}, {$guardName}, team_id={$teamLabel}] after insertOrIgnore."
            );
        }

        static::syncHostIdOnRole($role, $hostId);

        return $role;
    }

    private static function syncHostIdOnRole(Role $role, ?int $hostId): void
    {
        if ($hostId === null) {
            return;
        }

        $current = (int) ($role->host_id ?? 0);
        if ($current === (int) $hostId) {
            return;
        }

        $role->forceFill(['host_id' => $hostId])->save();
    }
}
