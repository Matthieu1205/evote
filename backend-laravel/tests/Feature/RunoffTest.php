<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Services\CryptoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RunoffTest extends TestCase
{
    use RefreshDatabase;

    public function test_second_tour_qualifie_les_deux_premiers_et_ecarte_le_dernier(): void
    {
        $org = $this->makeOrg();
        $commission = $this->makeUser($org, ['role' => 'COMMISSION']);
        $election = $this->makeElection($org, ['status' => 'CLOS', 'majority_rule' => 'ABSOLUE', 'total_rounds' => 2]);
        $position = $this->makePosition($election);

        $cA = $this->makeCandidacy($position, $this->makeUser($org, ['role' => 'CANDIDAT']));
        $cB = $this->makeCandidacy($position, $this->makeUser($org, ['role' => 'CANDIDAT']));
        $cC = $this->makeCandidacy($position, $this->makeUser($org, ['role' => 'CANDIDAT']));

        // Tour 1 : A=2, B=2, C=1 → aucun > 50 % → second tour, top 2 qualifiés.
        $crypto = app(CryptoService::class);
        foreach ([[$cA, 2], [$cB, 2], [$cC, 1]] as [$cand, $n]) {
            for ($i = 0; $i < $n; $i++) {
                $enc = $crypto->encryptBallot(['choices' => [$position->id => [$cand->id]]]);
                Ballot::create([
                    'organization_id' => $org->id, 'election_id' => $election->id, 'round' => 1,
                    'ciphertext' => $enc['ciphertext'], 'iv' => $enc['iv'], 'auth_tag' => $enc['authTag'],
                    'created_at' => now(),
                ]);
            }
        }

        Sanctum::actingAs($commission);
        $this->postJson("/api/elections/{$election->id}/runoff")
            ->assertOk()
            ->assertJson(['round' => 2]);

        $election->refresh();
        $this->assertSame('OUVERT', $election->status);
        $this->assertSame(2, $election->current_round);

        // A et B restent en lice ; C est éliminé (dernier tour = 1).
        $this->assertNull($cA->fresh()->last_round);
        $this->assertNull($cB->fresh()->last_round);
        $this->assertSame(1, $cC->fresh()->last_round);
    }

    public function test_pas_de_second_tour_pour_une_majorite_relative(): void
    {
        $org = $this->makeOrg();
        $commission = $this->makeUser($org, ['role' => 'COMMISSION']);
        $election = $this->makeElection($org, ['status' => 'CLOS', 'majority_rule' => 'RELATIVE']);
        $this->makePosition($election);

        Sanctum::actingAs($commission);
        $this->postJson("/api/elections/{$election->id}/runoff")->assertStatus(400);
    }
}
