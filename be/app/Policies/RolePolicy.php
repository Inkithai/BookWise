<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    use HandlesAuthorization;

    public function view(User $user, Role $model)
    {
        return $user->can('role.view');
    }

    public function create(User $user, Role $model)
    {
        return $user->can('role.create');
    }

    public function edit(User $user, Role $model)
    {
        return $user->can('role.edit');
    }

    public function delete(User $user, Role $model)
    {
        return $user->can('role.delete');
    }
}
