<?php

return [
    'title' => 'BookWise Accounting APIs',
    'description' => 'BookWise — multi-tenant accounting & bookkeeping API for SMBs.',
    'openapi' => '3.0.3',
    'version' => '1.0.0',
    'default' => 'default',

    'documentations' => [
        'default' => [
            'api' => [
                'title' => 'L5 Swagger UI',
            ],
            'routes' => [
                'api' => 'api/documentation',
            ],
            'paths' => [
                'use_absolute_path' => env('L5_SWAGGER_USE_ABSOLUTE_PATH', true),
                'swagger_ui_assets_path' => env('L5_SWAGGER_UI_ASSETS_PATH', 'vendor/swagger-api/swagger-ui/dist/'),
                'docs_json' => 'api-docs.json',
                'docs' => storage_path('api-docs'),
                'docs_yaml' => 'api-docs.yaml',
                'format_to_use_for_docs' => env('L5_FORMAT_TO_USE_FOR_DOCS', 'json'),
                'annotations' => [
                    base_path('app'),
                    base_path('Modules/Common/Http/Resources'),
                    base_path('Modules/User/Http/Controllers/API'),
                    base_path('Modules/User/Http/Resources'),
                    base_path('Modules/User/Http/Requests'),
                    base_path('Modules/User/Repositories'),
                    base_path('Modules/Role/Http/Controllers/API'),
                    base_path('Modules/Role/Http/Resources'),
                    base_path('Modules/Role/Http/Requests'),
                    base_path('Modules/Role/Repositories'),
                    base_path('Modules/CustomCRM/Http/Controllers/API'),
                    base_path('Modules/CustomCRM/Http/Resources'),
                    base_path('Modules/CustomCRM/Http/Requests'),
                    base_path('Modules/CustomCRM/Repositories'),
                    base_path('Modules/Invoice/Http/Controllers/API'),
                    base_path('Modules/Invoice/Http/Resources'),
                    base_path('Modules/Invoice/Http/Requests'),
                    base_path('Modules/Invoice/Repositories'),
                    app_path('Swagger'),      // If your schemas like ErrorResponse are here
                ],
            ],
        ],
    ],

    'defaults' => [
        'routes' => [
            'docs' => 'docs',
            'oauth2_callback' => 'api/oauth2-callback',
            'middleware' => [
                'api' => [],
                'asset' => [],
                'docs' => [],
                'oauth2_callback' => [],
            ],
            'group_options' => [],
        ],

        'paths' => [
            'docs' => storage_path('api-docs'),
            'views' => base_path('resources/views/vendor/l5-swagger'),
            'base' => env('L5_SWAGGER_BASE_PATH', null),
            'excludes' => [],
        ],

        'scanOptions' => [
            'exclude' => [],
            'open_api_spec_version' => env('L5_SWAGGER_OPEN_API_SPEC_VERSION', \L5Swagger\Generator::OPEN_API_DEFAULT_SPEC_VERSION),
        ],

        // ✅ JWT Security Definitions
        'securityDefinitions' => [
            'securitySchemes' => [
                'bearerAuth' => [
                    'type' => 'http',
                    'scheme' => 'bearer',
                    'bearerFormat' => 'JWT',
                    'description' => 'Enter JWT token in format: Bearer {token}',
                ],
            ],
            'security' => [
                [
                    'bearerAuth' => [],
                ],
            ],
        ],

        'generate_always' => env('L5_SWAGGER_GENERATE_ALWAYS', false),
        'generate_yaml_copy' => env('L5_SWAGGER_GENERATE_YAML_COPY', false),
        'proxy' => false,
        'additional_config_url' => null,
        'operations_sort' => env('L5_SWAGGER_OPERATIONS_SORT', null),
        'validator_url' => null,

        'ui' => [
            'display' => [
                'dark_mode' => env('L5_SWAGGER_UI_DARK_MODE', false),
                'doc_expansion' => env('L5_SWAGGER_UI_DOC_EXPANSION', 'none'),
                'filter' => env('L5_SWAGGER_UI_FILTERS', true),
            ],
            'authorization' => [
                'persist_authorization' => env('L5_SWAGGER_UI_PERSIST_AUTHORIZATION', true),
                'oauth2' => [
                    'use_pkce_with_authorization_code_grant' => false,
                ],
            ],
        ],
    ],
];
