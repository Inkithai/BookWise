<?php

namespace Modules\Role\Repositories;

interface RoleRepositoryInterface
{
    public function getAll(array $filters);
    public function getById($id);
    public function store(array $data);
    public function update($id, array $data);
    public function delete($id);
}
