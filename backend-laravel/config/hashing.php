<?php

return [
    // Argon2id (parité avec le backend NestJS — @node-rs/argon2).
    'driver' => 'argon2id',

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => true,
    ],

    'argon' => [
        // memory en Kio (19456 Kio ≈ 19 Mo, recommandation OWASP).
        'memory' => 19456,
        'threads' => 1,
        'time' => 2,
        'verify' => true,
    ],
];
