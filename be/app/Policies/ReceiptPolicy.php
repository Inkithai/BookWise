<?php

namespace App\Policies;

use Modules\User\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ReceiptPolicy
{
    use HandlesAuthorization;

    /** Allow any authenticated user for receipt (per-user per-team role not required). */
    public function view(User $user)
    {
        return true;
    }

    public function create(User $user)
    {
        return true;
    }

    public function edit(User $user)
    {
        return true;
    }

    public function delete(User $user)
    {
        return true;
    }

    public function mail(User $user)
    {
        return true;
    }
}
