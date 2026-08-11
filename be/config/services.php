<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],
'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        // ✅ MUST point to your FRONTEND callback page — NOT the backend API.
        // This must exactly match what is registered in Google Cloud Console.
        'redirect'      => env('GOOGLE_REDIRECT_URI', env('FRONTEND_URL') . '/auth/google/callback'),
    ],

    'stripe' => [
        'key' => env('STRIPE_PUBLISHABLE_KEY', env('STRIPE_KEY')),
        'secret' => env('STRIPE_SECRET_KEY', env('STRIPE_SECRET')),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'webhook_secret_sub' => env('STRIPE_WEBHOOK_SECRET_SUB'),
    ],

    'bookwise' => [
        'url' => rtrim((string) env('BOOKWISE_API_URL', 'http://127.0.0.1:8000'), '/'),
        'api_key' => (string) env('BOOKWISE_APP_API_KEY', env('APP_API_KEY', '')),
    ],

];
