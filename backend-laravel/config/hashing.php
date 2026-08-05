<?php

return [
    // Argon2id par défaut (local). En production Docker, l'extension Argon2
    // n'est pas toujours disponible : on peut basculer sur bcrypt via
    // HASH_DRIVER=bcrypt. bcrypt est tout aussi sûr et toujours disponible.
    // (Hash::check détecte automatiquement l'algorithme, aucun souci de mixité.)
    'driver' => env('HASH_DRIVER', 'argon2id'),

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
