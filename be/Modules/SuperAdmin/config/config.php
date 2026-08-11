<?php

return [
    'name' => 'SuperAdmin',
    
    /*
    |--------------------------------------------------------------------------
    | Super Admin Module Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options for the Super Admin Analytics module
    |
    */
    
    'pagination' => [
        'default_per_page' => 20,
        'max_per_page' => 100,
    ],
    
    'features' => [
        'allow_super_admin_deletion' => false,
        'activity_log_limit' => 20,
        'payment_history_limit' => 10,
    ],
];
