<?php

namespace Modules\SuperAdmin\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('api')->user();

        // Check if user is authenticated
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please login to continue.'
            ], 401);
        }

        // Check if user has super-admin role
        if (!$user->hasRole('super-admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Super Admin privileges required.'
            ], 403);
        }

        return $next($request);
    }
}
