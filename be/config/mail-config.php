<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Mail Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration file contains mail-related settings for email templates.
    |
    */

    'logo_url' => env('MAIL_LOGO_URL', '@file:logo-new.png'),

    'company_name' => env('MAIL_COMPANY_NAME', 'BookWise'),

    'app_store_badge_url' => env('MAIL_APP_STORE_BADGE_URL', 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg'),

    'play_store_badge_url' => env('MAIL_PLAY_STORE_BADGE_URL', 'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg'),

    'app_store_url' => env('MAIL_APP_STORE_URL', '#'),

    'play_store_url' => env('MAIL_PLAY_STORE_URL', '#'),

    /*
    |--------------------------------------------------------------------------
    | Support Recipients
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of addresses that receive customer support tickets.
    |
    */

    'support_recipients' => env('MAIL_SUPPORT_RECIPIENTS', 'support@bookwise.com'),

];
