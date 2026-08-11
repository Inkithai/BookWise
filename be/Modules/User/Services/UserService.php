<?php

namespace Modules\User\Services;

use Modules\User\Repositories\UserRepositoryInterface;

class UserService
{
    protected $repo;

    public function __construct(UserRepositoryInterface $repo)
    {
        $this->repo = $repo;
    }

    public function register(array $data)
    {
        return $this->repo->create($data);
    }
}
