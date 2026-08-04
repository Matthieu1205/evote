<?php

namespace App\Services;

use App\Models\Ballot;
use App\Models\Election;
use App\Models\User;
use App\Models\VoteRecord;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class VoteService
{
    public function __construct(
        private CryptoService $crypto,
        private OtpService $otp,
        private AuditService $audit,
    ) {}

    /**
     * Un électeur a-t-il déjà voté pour un scrutin/tour donné ?
     *
     * @return array{hasVoted:bool,round:int}
     */
    public function hasVoted(string $organizationId, string $electionId, string $userId, ?int $round = null): array
    {
        $election = Election::where('id', $electionId)
            ->where('organization_id', $organizationId)
            ->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");

        $r = $round ?? $election->current_round;

        $exists = VoteRecord::where('election_id', $electionId)
            ->where('user_id', $userId)
            ->where('round', $r)
            ->exists();

        return ['hasVoted' => $exists, 'round' => $r];
    }

    /**
     * Émettre un OTP de vote.
     *
     * @return array{message:string,devCode?:string}
     */
    public function requestVoteOtp(string $organizationId, string $electionId, string $userId): array
    {
        $election = Election::where('id', $electionId)
            ->where('organization_id', $organizationId)
            ->first();
        abort_if(! $election, 404, 'Élection introuvable.');
        abort_if($election->status !== 'OUVERT', 403, "Cette élection n'est pas ouverte au vote.");

        $code = $this->otp->issueOtp($userId, 'VOTE', $electionId);

        return [
            'message' => 'Code OTP de vote envoyé.',
            ...(config('evote.otp.expose_code') ? ['devCode' => $code] : []),
        ];
    }

    /**
     * Enregistrer un vote : bulletin chiffré + émargement séparé.
     *
     * @param  array<string,string[]>  $choices
     * @return array{message:string}
     */
    public function castVote(string $organizationId, string $electionId, array $choices, string $otp, string $userId, ?string $ip = null): array
    {
        // 1. Élection + candidatures validées.
        $election = Election::with(['positions.candidacies' => function ($q) {
            $q->where('status', 'VALIDEE')->select('id', 'position_id', 'last_round');
        }])
            ->where('id', $electionId)
            ->where('organization_id', $organizationId)
            ->first();
        abort_if(! $election, 404, 'Élection introuvable.');
        abort_if($election->status !== 'OUVERT', 403, "Cette élection n'est pas ouverte au vote.");

        // 2. Éligibilité de l'électeur.
        $user = User::where('id', $userId)->where('organization_id', $organizationId)->first();
        abort_if(! $user || ! $user->is_eligible || $user->status !== 'ACTIF', 403, "Vous n'êtes pas éligible à voter.");
        abort_if(
            $election->eligible_section && $user->section !== $election->eligible_section,
            403,
            "Vous n'êtes pas dans la section éligible pour ce scrutin.",
        );

        // 3. Anti-double-vote.
        $round = $election->current_round;
        $already = VoteRecord::where('election_id', $electionId)
            ->where('user_id', $userId)
            ->where('round', $round)
            ->exists();
        abort_if($already, 409, 'Vous avez déjà voté pour ce scrutin.');

        // 4. OTP de vote.
        if (! $this->otp->verifyOtp($userId, 'VOTE', $otp, $electionId)) {
            $this->audit->log([
                'actorId' => $userId,
                'action' => 'VOTE_OTP_FAILED',
                'entity' => 'Election',
                'entityId' => $electionId,
                'ip' => $ip,
                'organizationId' => $organizationId,
            ]);
            abort(403, 'Code OTP de vote invalide ou expiré.');
        }

        // 5. Valider les choix.
        $validCandidacyIds = [];
        $positionsById = [];
        foreach ($election->positions as $p) {
            $positionsById[$p->id] = $p;
            foreach ($p->candidacies as $c) {
                // Seules les candidatures en lice pour le tour courant sont votables.
                if ($c->last_round === null || $c->last_round >= $round) {
                    $validCandidacyIds[$c->id] = true;
                }
            }
        }

        foreach ($choices as $positionId => $selected) {
            $position = $positionsById[$positionId] ?? null;
            abort_if(! $position, 403, "Poste {$positionId} invalide pour cette élection.");

            if (count(array_unique($selected)) !== count($selected)) {
                abort(403, "Choix en double pour le poste \"{$position->title}\".");
            }
            if (count($selected) > $position->seats) {
                abort(403, "Trop de choix pour le poste \"{$position->title}\" (max {$position->seats}).");
            }
            foreach ($selected as $candidacyId) {
                abort_if(! isset($validCandidacyIds[$candidacyId]), 403, "Candidature {$candidacyId} invalide ou non validée.");
            }
        }

        // 6. Chiffrer le bulletin (aucun lien vers l'électeur).
        $encrypted = $this->crypto->encryptBallot(['choices' => $choices]);
        $ballotCreatedAt = $this->jitteredBallotTimestamp($election->start_at);

        // 7. Transaction : bulletin + émargement (atomiques).
        DB::transaction(function () use ($electionId, $organizationId, $round, $encrypted, $ballotCreatedAt, $userId) {
            Ballot::create([
                'election_id' => $electionId,
                'organization_id' => $organizationId,
                'round' => $round,
                'ciphertext' => $encrypted['ciphertext'],
                'iv' => $encrypted['iv'],
                'auth_tag' => $encrypted['authTag'],
                'created_at' => $ballotCreatedAt,
            ]);

            VoteRecord::create([
                'election_id' => $electionId,
                'organization_id' => $organizationId,
                'user_id' => $userId,
                'round' => $round,
                'voted_at' => now(),
            ]);
        });

        $this->audit->log([
            'actorId' => $userId,
            'action' => 'VOTE_CAST',
            'entity' => 'Election',
            'entityId' => $electionId,
            'meta' => ['round' => $round],
            'ip' => $ip,
            'organizationId' => $organizationId,
        ]);

        return ['message' => 'Vote enregistré avec succès.'];
    }

    /**
     * Décale l'horodatage du bulletin (jusqu'à 20 min dans le passé, borné à
     * l'ouverture du scrutin) pour empêcher la ré-association temporelle
     * bulletin ↔ émargement.
     */
    private function jitteredBallotTimestamp(Carbon $electionStartAt): Carbon
    {
        $maxJitterMs = 20 * 60 * 1000;
        $jittered = now()->subMilliseconds(random_int(0, $maxJitterMs));

        return $jittered->lt($electionStartAt) ? $electionStartAt->copy() : $jittered;
    }
}
