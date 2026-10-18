<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The Next.js frontend is deployed separately (Vercel) and calls this API
    | cross-origin. Set CORS_ALLOWED_ORIGINS in production to a comma-separated
    | list of frontend origins, e.g.:
    |
    |   CORS_ALLOWED_ORIGINS=https://bookwise.vercel.app,https://app.bookwise.lk
    |
    | Leaving it empty allows any origin ("*"), which is fine for the
    | Bearer-token based API but should be tightened for production.
    |
    */

    'paths' => ['api/*', 'oauth/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(
        array_map(
            'trim',
            explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))
        )
    ) ?: ['*'],

    'allowed_origins_patterns' => array_filter(
        array_map(
            'trim',
            explode(',', (string) env('CORS_ALLOWED_ORIGINS_PATTERNS', ''))
        )
    ),

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', false),

];
