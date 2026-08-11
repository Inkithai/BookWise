<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOtpVerified
{
    /**
     * Handle an incoming request.
     *
     * This middleware ensures that users have verified their OTP
     * before accessing protected routes.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->guard('api')->user();

        // If no user is authenticated, let the auth middleware handle it
        if (!$user) {
            return $next($request);
        }

        // Check if user has verified OTP
        if ($user->is_otp_verified == 0) {
            return response()->json([
                'success' => false,
                'auth_status' => 'otp_required',
                'message' => 'OTP verification required. Please verify your email to continue.',
                'data' => [
                    'email' => $user->email,
                ],
            ], 403);
        }

        return $next($request);
    }
}
