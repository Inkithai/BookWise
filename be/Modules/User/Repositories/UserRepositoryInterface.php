<?php

namespace Modules\User\Repositories;

use Modules\User\Models\User;

interface UserRepositoryInterface
{
    public function getAll(array $filters);
    public function findById($id);
    public function create(array $data);
    public function update(array $data, $id, $isRemove);
    public function changeCompanyData(array $data);
    public function delete($id, $action);
    public function removeCompanyLogo();
    public function resolveHostIdForUser(User $user): int;
}
