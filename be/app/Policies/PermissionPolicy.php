<?php

namespace App\Policies;

use Modules\User\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PermissionPolicy
{
    use HandlesAuthorization;


    public function view(User $user)
    {
        return $user->can('permission.view');
    }

    public function create(User $user)
    {
        return $user->can('permission.create');
    }

    public function edit(User $user)
    {
        return $user->can('permission.edit');
    }

    public function delete(User $user)
    {
        return $user->can('permission.delete');
    }
}
