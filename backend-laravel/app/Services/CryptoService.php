<?php

namespace App\Services;

use RuntimeException;

/**
 * Chiffrement des bulletins en AES-256-GCM (parité avec le CryptoService
 * NestJS). Format : ciphertext / iv / authTag encodés en base64.
 */
class CryptoService
{
    private const ALGO = 'aes-256-gcm';

    private function key(): string
    {
        $hex = config('evote.ballot_key');
        if (! is_string($hex) || strlen($hex) !== 64 || ! ctype_xdigit($hex)) {
            throw new RuntimeException(
                'BALLOT_ENCRYPTION_KEY manquante ou invalide (64 caractères hexadécimaux attendus).',
            );
        }

        return hex2bin($hex);
    }

    /**
     * @param  array<string,mixed>  $plain
     * @return array{ciphertext:string,iv:string,authTag:string}
     */
    public function encryptBallot(array $plain): array
    {
        $key = $this->key();
        $iv = random_bytes(12);
        $tag = '';

        $ciphertext = openssl_encrypt(
            json_encode($plain, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            self::ALGO,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            16,
        );

        if ($ciphertext === false) {
            throw new RuntimeException('Échec du chiffrement du bulletin.');
        }

        return [
            'ciphertext' => base64_encode($ciphertext),
            'iv' => base64_encode($iv),
            'authTag' => base64_encode($tag),
        ];
    }

    /**
     * @param  array{ciphertext:string,iv:string,authTag:string}  $payload
     * @return array<string,mixed>
     */
    public function decryptBallot(array $payload): array
    {
        $key = $this->key();

        $plaintext = openssl_decrypt(
            base64_decode($payload['ciphertext']),
            self::ALGO,
            $key,
            OPENSSL_RAW_DATA,
            base64_decode($payload['iv']),
            base64_decode($payload['authTag']),
        );

        if ($plaintext === false) {
            throw new RuntimeException('Échec du déchiffrement du bulletin.');
        }

        return json_decode($plaintext, true, 512, JSON_THROW_ON_ERROR);
    }

    public function sha256(string $input): string
    {
        return hash('sha256', $input);
    }

    public function randomNumericCode(int $length = 6): string
    {
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= (string) random_int(0, 9);
        }

        return $code;
    }

    public function randomPassword(int $length = 12): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        $max = strlen($chars) - 1;
        $pwd = '';
        for ($i = 0; $i < $length; $i++) {
            $pwd .= $chars[random_int(0, $max)];
        }

        return $pwd;
    }
}
