<?php

namespace App\Policies;

use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\CustomCRM\Models\CustomTable;
use Modules\User\Models\User;

class CustomPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any custom table.
     * Optional model allows global index access without a specific record.
     */
    public function view(User $user, ?CustomTable $model = null): bool
    {
        return $user->can('custom.view');
    }

    /**
     * Determine whether the user can create a custom table.
     */
    public function create(User $user, ?CustomTable $model = null): bool
    {
        return $user->can('custom.create');
    }

    /**
     * Determine whether the user can create a custom table.
     */
    public function uploadCsv(User $user, ?CustomTable $model = null): bool
    {
        return $user->can('custom.upload-csv');
    }

    /**
     * Determine whether the user can update a specific custom table.
     */
    public function update(User $user, CustomTable $model): bool
    {
        return $user->can('custom.edit');
    }

    /**
     * Determine whether the user can delete a specific custom table.
     */
    public function delete(User $user, ?CustomTable $model = null): bool
    {
        return $user->can('custom.delete');
    }
}
