<?php

return [
    // Clé AES-256-GCM des bulletins (64 hex = 32 octets). openssl rand -hex 32
    'ballot_key' => env('BALLOT_ENCRYPTION_KEY'),

    'otp' => [
        // "log" (écrit dans les logs) ou "email"
        'delivery' => env('OTP_DELIVERY', 'log'),
        // Renvoie l'OTP dans la réponse API — JAMAIS true en production.
        'expose_code' => env('OTP_EXPOSE_CODE', false),
        // Court-circuite l'OTP à la connexion — dev uniquement.
        'bypass' => env('OTP_BYPASS', false),
        // Redirige tous les OTP vers cette adresse (tests).
        'override_email' => env('OTP_OVERRIDE_EMAIL'),
        // Durée de vie (secondes) et nombre max de tentatives.
        'ttl' => 5 * 60,
        'max_attempts' => 5,
    ],

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key' => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
    ],
];
