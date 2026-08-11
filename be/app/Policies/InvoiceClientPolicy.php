<?php

namespace App\Policies;


use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Invoice\Models\InvoiceClient;
use Modules\User\Models\User;

class InvoiceClientPolicy
{
    use HandlesAuthorization;

    /** Allow any authenticated user for invoice clients (per-user per-team role not required). */
    public function view(User $user, $model)
    {
        return true;
    }

    public function create(User $user, $model)
    {
        return true;
    }

    public function edit(User $user, $model)
    {
        return true;
    }

    public function delete(User $user, $model)
    {
        return true;
    }
}
