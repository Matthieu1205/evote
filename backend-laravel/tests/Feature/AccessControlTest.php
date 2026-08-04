<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Contrôle d'accès aux résultats — correctifs d'audit C1 et E2.
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_electeur_ne_voit_pas_les_resultats_en_temps_reel(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org);
        Sanctum::actingAs($voter);

        // C1 : jamais de dépouillement en direct pour un électeur.
        $this->getJson("/api/elections/{$election->id}/live-results")->assertStatus(403);
    }

    public function test_commission_accede_aux_resultats_en_temps_reel(): void
    {
        $org = $this->makeOrg();
        $commission = $this->makeUser($org, ['role' => 'COMMISSION']);
        $election = $this->makeElection($org);
        $this->makePosition($election);
        Sanctum::actingAs($commission);

        $this->getJson("/api/elections/{$election->id}/live-results")
            ->assertOk()
            ->assertJsonStructure(['positions', 'turnout', 'ballotsCount']);
    }

    public function test_electeur_ne_voit_les_resultats_qu_une_fois_publies(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org, ['status' => 'DEPOUILLE']);
        $this->makePosition($election);
        Sanctum::actingAs($voter);

        // E2 : DÉPOUILLÉ mais non PUBLIÉ → interdit à l'électeur.
        $this->getJson("/api/elections/{$election->id}/results")->assertStatus(403);

        $election->update(['status' => 'PUBLIE']);
        $this->getJson("/api/elections/{$election->id}/results")->assertOk();
    }

    public function test_electeur_ne_peut_pas_creer_de_scrutin(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        Sanctum::actingAs($voter);

        $this->postJson('/api/elections', [
            'title' => 'X', 'startAt' => now()->addDay()->toIso8601String(), 'endAt' => now()->addDays(2)->toIso8601String(),
        ])->assertStatus(403);
    }
}
