<?php

namespace Tests\Unit;

use App\Services\CryptoService;
use RuntimeException;
use Tests\TestCase;

class CryptoServiceTest extends TestCase
{
    private function crypto(): CryptoService
    {
        return app(CryptoService::class);
    }

    public function test_chiffre_et_dechiffre_un_bulletin(): void
    {
        $svc = $this->crypto();
        $payload = ['choices' => ['pos1' => ['candA', 'candB']]];

        $enc = $svc->encryptBallot($payload);

        $this->assertArrayHasKey('ciphertext', $enc);
        $this->assertArrayHasKey('iv', $enc);
        $this->assertArrayHasKey('authTag', $enc);
        // Le contenu chiffré ne doit pas laisser transparaître le clair.
        $this->assertStringNotContainsString('candA', base64_decode($enc['ciphertext']));
        // Aller-retour identique.
        $this->assertSame($payload, $svc->decryptBallot($enc));
    }

    public function test_un_bulletin_altere_est_rejete(): void
    {
        $svc = $this->crypto();
        $enc = $svc->encryptBallot(['x' => 1]);

        // Altération du texte chiffré → l'authTag GCM doit faire échouer.
        $enc['ciphertext'] = base64_encode(base64_decode($enc['ciphertext']).'x');

        $this->expectException(RuntimeException::class);
        $svc->decryptBallot($enc);
    }

    public function test_deux_chiffrements_du_meme_contenu_different(): void
    {
        $svc = $this->crypto();
        $a = $svc->encryptBallot(['x' => 1]);
        $b = $svc->encryptBallot(['x' => 1]);

        // IV aléatoire à chaque chiffrement → sorties distinctes.
        $this->assertNotSame($a['iv'], $b['iv']);
        $this->assertNotSame($a['ciphertext'], $b['ciphertext']);
    }
}
