<?php

namespace Tests\Feature;

use App\Models\Ballot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VoteTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{voter:\App\Models\User,election:\App\Models\Election,position:\App\Models\Position,candidacy:\App\Models\Candidacy}
     */
    private function scenario(): array
    {
        $org = $this->makeOrg();
        $voter = $this->makeUser($org, ['role' => 'ELECTEUR']);
        $election = $this->makeElection($org);
        $position = $this->makePosition($election);
        $candUser = $this->makeUser($org, ['role' => 'CANDIDAT']);
        $candidacy = $this->makeCandidacy($position, $candUser);

        return compact('voter', 'election', 'position', 'candidacy');
    }

    private function otpFor(string $electionId): string
    {
        return $this->postJson("/api/votes/request-otp/{$electionId}")->json('devCode');
    }

    public function test_un_electeur_peut_voter_bulletin_chiffre_et_emargement_separe(): void
    {
        ['voter' => $v, 'election' => $e, 'position' => $p, 'candidacy' => $c] = $this->scenario();
        Sanctum::actingAs($v);

        $res = $this->postJson('/api/votes', [
            'electionId' => $e->id, 'otp' => $this->otpFor($e->id), 'choices' => [$p->id => [$c->id]],
        ]);

        $res->assertOk()->assertJson(['message' => 'Vote enregistré avec succès.']);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseHas('vote_records', ['election_id' => $e->id, 'user_id' => $v->id, 'round' => 1]);

        // Le bulletin ne porte aucun identifiant d'électeur.
        $ballot = Ballot::first();
        $this->assertStringNotContainsString($v->id, $ballot->ciphertext);
    }

    public function test_double_vote_bloque(): void
    {
        ['voter' => $v, 'election' => $e, 'position' => $p, 'candidacy' => $c] = $this->scenario();
        Sanctum::actingAs($v);

        $this->postJson('/api/votes', [
            'electionId' => $e->id, 'otp' => $this->otpFor($e->id), 'choices' => [$p->id => [$c->id]],
        ])->assertOk();

        $this->postJson('/api/votes', [
            'electionId' => $e->id, 'otp' => $this->otpFor($e->id), 'choices' => [$p->id => [$c->id]],
        ])->assertStatus(409);

        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('vote_records', 1);
    }

    public function test_electeur_non_eligible_ne_peut_pas_voter(): void
    {
        ['voter' => $v, 'election' => $e, 'position' => $p, 'candidacy' => $c] = $this->scenario();
        $v->update(['is_eligible' => false]);
        Sanctum::actingAs($v);

        $this->postJson('/api/votes', [
            'electionId' => $e->id, 'otp' => '123456', 'choices' => [$p->id => [$c->id]],
        ])->assertStatus(403);

        $this->assertDatabaseCount('ballots', 0);
    }

    public function test_vote_exige_un_otp_valide(): void
    {
        ['voter' => $v, 'election' => $e, 'position' => $p, 'candidacy' => $c] = $this->scenario();
        Sanctum::actingAs($v);

        $this->postJson('/api/votes', [
            'electionId' => $e->id, 'otp' => '000000', 'choices' => [$p->id => [$c->id]],
        ])->assertStatus(403);

        $this->assertDatabaseCount('ballots', 0);
    }

    public function test_vote_impossible_si_scrutin_non_ouvert(): void
    {
        ['voter' => $v, 'election' => $e, 'position' => $p, 'candidacy' => $c] = $this->scenario();
        $e->update(['status' => 'CLOS']);
        Sanctum::actingAs($v);

        // La demande d'OTP elle-même est refusée sur un scrutin non ouvert.
        $this->postJson("/api/votes/request-otp/{$e->id}")->assertStatus(403);
    }
}
