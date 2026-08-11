<?php
return [
    'key' => env('STRIPE_PUBLISHABLE_KEY', env('STRIPE_KEY')),
    'secret' => env('STRIPE_SECRET_KEY', env('STRIPE_SECRET')),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    'webhook_secret_sub' => env('STRIPE_WEBHOOK_SECRET_SUB')
];
