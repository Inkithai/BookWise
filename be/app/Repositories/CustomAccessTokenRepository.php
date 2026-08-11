<?php

namespace App\Repositories;

use Laravel\Passport\Bridge\AccessTokenRepository;

class CustomAccessTokenRepository extends AccessTokenRepository
{
    /**
     * Bypasses the local database check for revoked tokens.
     * Tokens issued by the main server won't exist in our local database.
     */
    public function isAccessTokenRevoked($tokenId): bool
    {
        return false;
    }
}
