<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        // For API requests, do not redirect
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        return null; // fallback
    }

    /**
     * Handle unauthenticated users.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  array  $guards
     * @return void
     *
     * @throws \Illuminate\Auth\AuthenticationException
     */
    protected function unauthenticated($request, array $guards)
    {
        // For API requests, return JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            throw new AuthenticationException(
                'Unauthenticated.', $guards
            );
        }

        // For web requests, fallback to parent
        parent::unauthenticated($request, $guards);
    }
}
