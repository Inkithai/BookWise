<?php

namespace App\Providers;

use Illuminate\Auth\EloquentUserProvider;

class CustomUserProvider extends EloquentUserProvider
{
    /**
     * Retrieve a user by their unique identifier.
     *
     * @param  mixed  $identifier
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function retrieveById($identifier)
    {
        $user = parent::retrieveById($identifier);

        // If user doesn"t exist locally, create a stub so TokenGuard validations pass.
        // It will be synced cleanly by SyncOAuth2User immediately after.
        if (!$user && $identifier) {
            $user = $this->createModel()->forceFill([
                $this->createModel()->getKeyName() => $identifier,
                "email" => "temp_" . $identifier . "@sso.local",
                "user_name" => "user_" . $identifier,
                "first_name" => "SSO",
                "last_name" => "User",
                "account_type" => "admin",
                "password" => "\$2y\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
            ]);
            $user->save();
        }

        return $user;
    }
}
