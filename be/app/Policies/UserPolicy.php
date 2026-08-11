<?php

namespace App\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\User\Models\User;

class UserPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\User  $model
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function view(User $user, User $model)
    {
        return $user->can('user.view');
    }

    /**
     * Determine whether the user can create models.
     *
     * @param  \App\Models\User  $user
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function create(User $user)
    {
        return $user->can('user.create');
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\User  $model
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function update(User $user, User $model)
    {
        return $user->can('user.edit');
    }

    /**
     * Determine whether the user can delete the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\User  $model
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function delete(User $user, User $model)
    {
        return $user->can('user.delete');
    }

    /**
     * Determine whether the user can update the model.
     *
     * @param  \App\Models\User  $user
     * @param  \App\Models\User  $model
     * @return \Illuminate\Auth\Access\Response|bool
     */
    public function changeCompany(User $user, User $model)
    {
        // Super-admin always allowed
        if ($user->hasRole('super-admin')) {
            return true;
        }

        // Primary account owner (has no host_id, or IS the primary billing user for their host)
        $hostId = (int) ($user->host_id ?? 0);
        if ($hostId <= 0) {
            // Rootless user (rare edge case) — allow if they have the permission
            return $user->can('company.change');
        }

        $primary = User::primaryBillingUserForHost($hostId);
        if ($primary && (int) $primary->id === (int) $user->id) {
            // This IS the primary account owner — always allowed
            return true;
        }

        // Sub-user: allowed only if they have company.change permission
        // (the parent controls this by enabling/disabling it on the sub-user's role)
        return $user->can('company.change');
    }
}
