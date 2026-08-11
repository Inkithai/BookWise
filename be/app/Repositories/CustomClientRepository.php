<?php

namespace App\Repositories;

use Laravel\Passport\ClientRepository;
use Laravel\Passport\Passport;

class CustomClientRepository extends ClientRepository
{
    /**
     * Bypasses client ID checking locally.
     * Tokens issued remotely need their parent client artificially accepted.
     */
    public function findActive(string|int $id): ?\Laravel\Passport\Client
    {
        $client = parent::findActive($id);
        
        if (!$client) {
            $client = Passport::client();
            $client->id = $id;
            $client->provider = 'users';
            $client->revoked = false;
        }

        return $client;
    }
}