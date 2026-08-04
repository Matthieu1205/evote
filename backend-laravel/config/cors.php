<?php

// Durcissement CORS (corrige la faille E1 de l'audit : plus de motif
// générique *.vercel.app). Seule l'origine du frontend configurée est
// autorisée, avec credentials pour les cookies de session.
$frontend = env('FRONTEND_URL', 'http://localhost:5173');

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'uploads/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter([
        $frontend,
        'http://localhost:5173',
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
