<?php

namespace Tests;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Organization;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        // Pas de limitation de débit dans les tests.
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    protected function makeOrg(array $o = []): Organization
    {
        return Organization::create(array_merge([
            'slug' => 'org-'.Str::lower(Str::random(6)),
            'name' => 'Organisation Test',
            'member_label' => 'Numéro',
            'is_platform' => false,
        ], $o));
    }

    protected function makeUser(Organization $org, array $o = []): User
    {
        return User::create(array_merge([
            'organization_id' => $org->id,
            'ordre_number' => 'M-'.Str::upper(Str::random(6)),
            'email' => 'u'.Str::lower(Str::random(8)).'@test.local',
            'first_name' => 'Test',
            'last_name' => 'User',
            'password_hash' => Hash::make('password'),
            'role' => 'ELECTEUR',
            'status' => 'ACTIF',
            'is_eligible' => true,
        ], $o));
    }

    protected function makeElection(Organization $org, array $o = []): Election
    {
        return Election::create(array_merge([
            'organization_id' => $org->id,
            'title' => 'Scrutin Test',
            'status' => 'OUVERT',
            'majority_rule' => 'RELATIVE',
            'total_rounds' => 1,
            'current_round' => 1,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(3),
        ], $o));
    }

    protected function makePosition(Election $e, array $o = []): Position
    {
        return Position::create(array_merge([
            'organization_id' => $e->organization_id,
            'election_id' => $e->id,
            'title' => 'Président',
            'seats' => 1,
            'order' => 0,
        ], $o));
    }

    protected function makeCandidacy(Position $p, User $u, array $o = []): Candidacy
    {
        return Candidacy::create(array_merge([
            'organization_id' => $p->organization_id,
            'position_id' => $p->id,
            'user_id' => $u->id,
            'status' => 'VALIDEE',
            'submitted_at' => now(),
        ], $o));
    }
}
