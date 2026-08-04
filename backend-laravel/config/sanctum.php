<?php

use Laravel\Sanctum\Sanctum;

$frontend = parse_url(env('FRONTEND_URL', 'http://localhost:5173'), PHP_URL_HOST);

return [
    // Domaines "stateful" : le SPA frontend est authentifié via le cookie de
    // session. Le reste passe par un token Bearer (Sanctum personal access).
    'stateful' => array_filter(array_map('trim', explode(',', (string) env(
        'SANCTUM_STATEFUL_DOMAINS',
        implode(',', array_filter([
            'localhost',
            'localhost:5173',
            '127.0.0.1',
            '127.0.0.1:8000',
            $frontend,
        ])),
    )))),

    'guard' => ['web'],

    // Tokens Bearer expirent au bout de 8h (parité avec le token NestJS).
    'expiration' => 480,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
