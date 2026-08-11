<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-to-server calls from BookWise all-be after subscription payment.
 */
class RequireBookWiseApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = (string) $request->header('api-key', '');
        $expected = (string) config('services.bookwise.api_key', '');

        if ($expected === '' || $apiKey === '' || ! hash_equals($expected, $apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or missing API key.',
            ], 403);
        }

        return $next($request);
    }
}
