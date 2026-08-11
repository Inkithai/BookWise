<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active tenant (host) for the request and stores it on the
 * {@see TenantManager} so tenant-scoped models can apply their global scope.
 *
 * Resolution order:
 *   1. X-Host-Id header  -> super-admin impersonation only
 *   2. Authenticated user's host_id
 *
 * When no tenant can be resolved (e.g. super-admin without X-Host-Id) the
 * TenantManager stays unresolved and tenant-scoped global scopes become
 * inert, allowing explicit cross-tenant administration.
 */
class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $hostId = null;

        if ($user instanceof User) {
            if ($user->hasRole('super-admin') && $request->header(config('tenant.header'))) {
                $hostId = (int) $request->header(config('tenant.header'));
            } else {
                $hostId = $user->host_id ? (int) $user->host_id : null;
            }
        }

        TenantManager::setId($hostId);

        return $next($request);
    }
}
