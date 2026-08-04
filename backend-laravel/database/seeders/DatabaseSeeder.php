<?php

namespace Database\Seeders;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Organization;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('Pharma2026!');

        $org = Organization::create([
            'slug' => 'demo',
            'name' => 'Organisation de démonstration',
            'member_label' => "Numéro d'ordre",
            'is_platform' => false,
        ]);

        // Comptes de référence.
        User::create([
            'organization_id' => $org->id,
            'ordre_number' => 'ADMIN-001',
            'email' => 'admin@evote.local',
            'first_name' => 'Alice',
            'last_name' => 'Admin',
            'password_hash' => $password,
            'role' => 'ADMIN',
            'status' => 'ACTIF',
            'is_eligible' => true,
        ]);

        $electeur = User::create([
            'organization_id' => $org->id,
            'ordre_number' => 'PH-1000',
            'email' => 'electeur@evote.local',
            'first_name' => 'Éric',
            'last_name' => 'Électeur',
            'password_hash' => $password,
            'role' => 'ELECTEUR',
            'status' => 'ACTIF',
            'is_eligible' => true,
        ]);

        // Deux candidats.
        $c1 = User::create([
            'organization_id' => $org->id,
            'ordre_number' => 'PH-2001',
            'email' => 'candidat1@evote.local',
            'first_name' => 'Camille',
            'last_name' => 'Candidat',
            'password_hash' => $password,
            'role' => 'CANDIDAT',
            'status' => 'ACTIF',
            'is_eligible' => true,
        ]);

        $c2 = User::create([
            'organization_id' => $org->id,
            'ordre_number' => 'PH-2002',
            'email' => 'candidat2@evote.local',
            'first_name' => 'Dominique',
            'last_name' => 'Dupont',
            'password_hash' => $password,
            'role' => 'CANDIDAT',
            'status' => 'ACTIF',
            'is_eligible' => true,
        ]);

        // Scrutin OUVERT.
        $election = Election::create([
            'organization_id' => $org->id,
            'title' => 'Élection du Président — démonstration',
            'description' => 'Scrutin de test pour la tranche verticale.',
            'status' => 'OUVERT',
            'majority_rule' => 'RELATIVE',
            'total_rounds' => 1,
            'current_round' => 1,
            'start_at' => now()->subDay(),
            'end_at' => now()->addDays(7),
        ]);

        $position = Position::create([
            'organization_id' => $org->id,
            'election_id' => $election->id,
            'title' => 'Président',
            'seats' => 1,
            'order' => 0,
        ]);

        foreach ([$c1, $c2] as $candidate) {
            Candidacy::create([
                'organization_id' => $org->id,
                'position_id' => $position->id,
                'user_id' => $candidate->id,
                'status' => 'VALIDEE',
                'submitted_at' => now()->subDays(3),
                'reviewed_at' => now()->subDays(2),
            ]);
        }

        $this->command->info('Seed terminé. Organisation "demo".');
        $this->command->info('Électeur : electeur@evote.local / Pharma2026! (slug: demo)');
        $this->command->info("Scrutin OUVERT : {$election->id}");
    }
}
