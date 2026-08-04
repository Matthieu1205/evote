<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_otp_mauvais_mot_de_passe_reponse_generique_et_aucun_otp(): void
    {
        $org = $this->makeOrg(['slug' => 'acme']);
        $this->makeUser($org, ['email' => 'a@b.com', 'password_hash' => Hash::make('secret123')]);

        $res = $this->postJson('/api/auth/request-otp', [
            'organizationSlug' => 'acme', 'email' => 'a@b.com', 'password' => 'mauvais',
        ]);

        $res->assertOk()->assertJson(['message' => 'Si ce compte existe, un OTP a été envoyé.']);
        $this->assertDatabaseCount('otps', 0);
    }

    public function test_connexion_complete_avec_otp_renvoie_un_token(): void
    {
        $org = $this->makeOrg(['slug' => 'acme']);
        $this->makeUser($org, ['email' => 'a@b.com', 'password_hash' => Hash::make('secret123'), 'role' => 'ADMIN']);

        $otp = $this->postJson('/api/auth/request-otp', [
            'organizationSlug' => 'acme', 'email' => 'a@b.com', 'password' => 'secret123',
        ]);
        $code = $otp->json('devCode');
        $this->assertNotNull($code);

        $login = $this->postJson('/api/auth/login', [
            'organizationSlug' => 'acme', 'email' => 'a@b.com', 'password' => 'secret123', 'otp' => $code,
        ]);

        $login->assertOk()->assertJsonStructure(['id', 'token', 'role', 'organization' => ['slug']]);
    }

    public function test_connexion_mauvais_otp_refusee(): void
    {
        $org = $this->makeOrg(['slug' => 'acme']);
        $this->makeUser($org, ['email' => 'a@b.com', 'password_hash' => Hash::make('secret123')]);

        $this->postJson('/api/auth/request-otp', [
            'organizationSlug' => 'acme', 'email' => 'a@b.com', 'password' => 'secret123',
        ]);

        $this->postJson('/api/auth/login', [
            'organizationSlug' => 'acme', 'email' => 'a@b.com', 'password' => 'secret123', 'otp' => '000000',
        ])->assertStatus(401);
    }

    public function test_route_protegee_sans_token_renvoie_401_json(): void
    {
        $this->getJson('/api/auth/me')
            ->assertStatus(401)
            ->assertJson(['message' => 'Session expirée ou non authentifié.']);
    }
}
