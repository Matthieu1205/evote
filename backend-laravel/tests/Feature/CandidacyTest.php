<?php

namespace Tests\Feature;

use App\Models\CandidacyCondition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CandidacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_le_depot_exige_d_accepter_les_conditions_si_definies(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org, ['status' => 'PLANIFIE']);
        $position = $this->makePosition($election);
        CandidacyCondition::create(['organization_id' => $org->id, 'text' => 'À jour des cotisations', 'order' => 0, 'created_at' => now()]);

        Sanctum::actingAs($voter);

        // Sans attestation → refusé.
        $this->postJson('/api/candidacies', ['positionId' => $position->id, 'program' => 'Mon programme'])
            ->assertStatus(400);

        // Avec attestation → accepté.
        $this->postJson('/api/candidacies', ['positionId' => $position->id, 'program' => 'Mon programme', 'acceptConditions' => true])
            ->assertOk()
            ->assertJson(['status' => 'SOUMISE']);

        $this->assertDatabaseHas('candidacies', [
            'position_id' => $position->id, 'user_id' => $voter->id, 'status' => 'SOUMISE',
        ]);
    }

    public function test_le_proprietaire_peut_modifier_sa_candidature_soumise(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org, ['status' => 'PLANIFIE']);
        $position = $this->makePosition($election);
        $cand = $this->makeCandidacy($position, $voter, ['status' => 'SOUMISE']);

        Sanctum::actingAs($voter);

        $this->putJson("/api/candidacies/{$cand->id}", ['currentRole' => 'Directeur'])
            ->assertOk()
            ->assertJson(['currentRole' => 'Directeur']);
    }

    public function test_impossible_de_modifier_une_candidature_validee(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org, ['status' => 'PLANIFIE']);
        $position = $this->makePosition($election);
        $cand = $this->makeCandidacy($position, $voter, ['status' => 'VALIDEE']);

        Sanctum::actingAs($voter);

        $this->putJson("/api/candidacies/{$cand->id}", ['currentRole' => 'X'])->assertStatus(403);
    }

    public function test_double_candidature_meme_poste_refusee(): void
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org, ['status' => 'PLANIFIE']);
        $position = $this->makePosition($election);
        $this->makeCandidacy($position, $voter, ['status' => 'SOUMISE']);

        Sanctum::actingAs($voter);

        $this->postJson('/api/candidacies', ['positionId' => $position->id, 'program' => 'Encore'])
            ->assertStatus(409);
    }
}
