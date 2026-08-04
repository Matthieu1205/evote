<?php

namespace Database\Seeders;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Organization;
use App\Models\Position;
use App\Models\User;
use App\Services\CryptoService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Scénario de démonstration du second tour : scrutin à la MAJORITÉ ABSOLUE,
 * 3 candidats, aucun au-dessus de 50 % au tour 1 → second tour requis.
 *
 *   php artisan db:seed --class=RunoffDemoSeeder
 */
class RunoffDemoSeeder extends Seeder
{
    public function run(): void
    {
        $crypto = app(CryptoService::class);
        $org = Organization::where('slug', 'demo')->firstOrFail();

        // Nettoyage d'un éventuel run précédent.
        Election::where('organization_id', $org->id)->where('title', 'Démo second tour')->delete();

        $pwd = Hash::make('Pharma2026!');
        $c3 = User::firstOrCreate(
            ['organization_id' => $org->id, 'email' => 'candidat3@evote.local'],
            ['ordre_number' => 'PH-2003', 'first_name' => 'Sacha', 'last_name' => 'Suppléant',
                'password_hash' => $pwd, 'role' => 'CANDIDAT', 'status' => 'ACTIF', 'is_eligible' => true],
        );
        $c1 = User::where('organization_id', $org->id)->where('email', 'candidat1@evote.local')->firstOrFail();
        $c2 = User::where('organization_id', $org->id)->where('email', 'candidat2@evote.local')->firstOrFail();

        $election = Election::create([
            'organization_id' => $org->id,
            'title' => 'Démo second tour',
            'description' => 'Scrutin à la majorité absolue — aucun vainqueur au tour 1.',
            'status' => 'CLOS',
            'majority_rule' => 'ABSOLUE',
            'total_rounds' => 2,
            'current_round' => 1,
            'start_at' => now()->subDays(2),
            'end_at' => now()->subDay(),
        ]);

        $position = Position::create([
            'organization_id' => $org->id,
            'election_id' => $election->id,
            'title' => 'Président (2 tours)',
            'seats' => 1,
            'order' => 0,
        ]);

        $candA = Candidacy::create(['organization_id' => $org->id, 'position_id' => $position->id, 'user_id' => $c1->id, 'status' => 'VALIDEE', 'submitted_at' => now()->subDays(3)]);
        $candB = Candidacy::create(['organization_id' => $org->id, 'position_id' => $position->id, 'user_id' => $c2->id, 'status' => 'VALIDEE', 'submitted_at' => now()->subDays(3)]);
        $candC = Candidacy::create(['organization_id' => $org->id, 'position_id' => $position->id, 'user_id' => $c3->id, 'status' => 'VALIDEE', 'submitted_at' => now()->subDays(3)]);

        // Tour 1 : A=2, B=2, C=1 → 40 % max, personne > 50 % → second tour.
        $plan = [[$candA, 2], [$candB, 2], [$candC, 1]];
        foreach ($plan as [$cand, $n]) {
            for ($i = 0; $i < $n; $i++) {
                $enc = $crypto->encryptBallot(['choices' => [$position->id => [$cand->id]]]);
                Ballot::create([
                    'organization_id' => $org->id,
                    'election_id' => $election->id,
                    'round' => 1,
                    'ciphertext' => $enc['ciphertext'],
                    'iv' => $enc['iv'],
                    'auth_tag' => $enc['authTag'],
                    'created_at' => now()->subDay(),
                ]);
            }
        }

        $this->command->info('=== Démo second tour prête ===');
        $this->command->info("Élection (CLOS, ABSOLUE) : {$election->id}");
        $this->command->info("Poste : {$position->id}");
        $this->command->info("Candidats — A:{$candA->id}  B:{$candB->id}  C:{$candC->id}");
        $this->command->info('Tour 1 : A=2, B=2, C=1 → aucun > 50 %. Lance le second tour via POST /elections/{id}/runoff.');
    }
}
