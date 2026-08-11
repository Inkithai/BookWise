<?php

namespace Modules\Role\Repositories;

use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleRepository implements RoleRepositoryInterface
{
    private $role;

    public function __construct(Role $role)
    {
        $this->role = $role;
    }

    private function resolveActiveHostId(): int
    {
        $user = auth()->user();
        if (
            (string) ($user->active_context_type ?? 'personal') === 'company'
            && !empty($user->active_company_id)
        ) {
            $company = \App\Models\Company::where('id', (int) $user->active_company_id)
                ->where('owner_user_id', $user->id)
                ->first();
            if ($company && $company->host_id) {
                return (int) $company->host_id;
            }
        }
        return (int) ($user->host_id ?? 0);
    }

    private function resolveActiveTeamId(): ?int
    {
        $hostId = $this->resolveActiveHostId();
        return \App\Models\Team::where('host_id', $hostId)->value('id');
    }

    public function getAll($data)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = $this->resolveActiveTeamId();

        $query = DB::table('roles');

        // Match invoice scope behavior exactly: team first, host fallback.
        if (!is_null($teamId)) {
            $query->where('team_id', (int) $teamId);
        } else {
            $query->where('host_id', (int) $hostId);
        }

        if (! empty($data['search'])) {
            $query->where(function ($q) use ($data) {
                $q->where('roles.name', 'like', '%'.$data['search'].'%');
            });
        }

        return $query->orderBy('created_at', 'ASC')->get();
    }

    public function getById($id)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = $this->resolveActiveTeamId();

        $query = $this->role->query();

        if (!is_null($teamId)) {
            $query->where('team_id', (int) $teamId);
        } else {
            $query->where('host_id', (int) $hostId);
        }

        $role = $query->find($id);

        if (! $role) {
            abort(404, 'Role not found');
        }

        return $role;
    }

    public function store($data)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = $this->resolveActiveTeamId();

        // Create the role with the appropriate host_id and team_id
        $role = $this->role->create([
            'name' => $data['name'],
            'guard_name' => 'api',
            'host_id' => $hostId,
            'team_id' => $teamId,
        ]);

        // Auto-assign all API permissions so sub-users with this role have full access
        // by default. The parent account can restrict specific permissions afterwards
        // via the assignPermissions endpoint.
        if ($teamId !== null) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($teamId);
        }
        $allPermissions = Permission::where('guard_name', 'api')->pluck('id')->toArray();
        if (!empty($allPermissions)) {
            $role->syncPermissions($allPermissions);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $role;
    }

    public function update($id, array $data)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = $this->resolveActiveTeamId();

        $role = Role::query()
            ->when(!is_null($teamId), fn ($q) => $q->where('team_id', (int) $teamId))
            ->when(is_null($teamId), fn ($q) => $q->where('host_id', (int) $hostId))
            ->findOrFail($id);

        $role->update([
            'name' => $data['name'],
        ]);

        return $role;
    }

    public function delete($id)
    {
        $hostId = $this->resolveActiveHostId();
        $teamId = $this->resolveActiveTeamId();

        $role = Role::query()
            ->when(!is_null($teamId), fn ($q) => $q->where('team_id', (int) $teamId))
            ->when(is_null($teamId), fn ($q) => $q->where('host_id', (int) $hostId))
            ->findOrFail($id); // throws 404 if not found

        return $role->delete();        // returns true/false
    }
}
