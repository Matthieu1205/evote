<?php

return [
    // Clé lue par le transport mail « resend » de Laravel.
    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key' => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
    ],
];
