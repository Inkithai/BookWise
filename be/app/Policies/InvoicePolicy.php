<?php

namespace App\Policies;

use Modules\User\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Invoice\Models\Invoice;

class InvoicePolicy
{
    use HandlesAuthorization;

    /** Allow admin/super-admin by role name so permission checks never 403 for them. */
    private function allowAdminOrSuperAdmin(User $user): bool
    {
        return $user->roles()->whereIn('name', ['admin', 'super-admin'])->exists();
    }

    /** Allow any authenticated user for invoice (per-user per-team role not required). */
    private function allowAnyAuthenticatedUser(User $user): bool
    {
        return true; // any logged-in user can access invoice module
    }

    public function view(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }

    public function manage(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }

    public function mail(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }

    public function create(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }

    public function edit(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }

    public function delete(User $user, $model)
    {
        return $this->allowAnyAuthenticatedUser($user);
    }
}
