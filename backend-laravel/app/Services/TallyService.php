<?php

namespace App\Services;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TallyService
{
    public function __construct(
        private CryptoService $crypto,
        private AuditService $audit,
        private ElectionService $elections,
    ) {}

    /** Rôles de surveillance : accès au dépouillement avant publication. */
    private const OVERSIGHT_ROLES = ['COMMISSION', 'ADMIN', 'OBSERVATEUR', 'SUPER_ADMIN'];

    /**
     * Calcule le dépouillement (déchiffrement des bulletins, comptage).
     *
     * @return array<string,mixed>
     */
    public function computeTally(string $organizationId, string $electionId, ?int $round = null): array
    {
        $election = Election::where('id', $electionId)
            ->where('organization_id', $organizationId)
            ->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");

        $r = $round ?? $election->current_round;

        // Ne retenir que les candidatures en lice pour ce tour (last_round NULL
        // = toujours en lice ; sinon elle doit couvrir le tour demandé).
        $election->load(['positions' => fn ($p) => $p->orderBy('order')
            ->with(['candidacies' => fn ($c) => $c->where('status', 'VALIDEE')
                ->where(fn ($q) => $q->whereNull('last_round')->orWhere('last_round', '>=', $r))
                ->with('user')])]);

        $ballots = Ballot::where('election_id', $electionId)
            ->where('organization_id', $organizationId)
            ->where('round', $r)
            ->get();

        $eligibleCount = User::where('organization_id', $organizationId)
            ->where('is_eligible', true)
            ->where('status', 'ACTIF')
            ->when($election->eligible_section, fn ($q) => $q->where('section', $election->eligible_section))
            ->count();

        // Initialise les compteurs.
        $counters = [];       // positionId => [candidacyId => votes]
        $positionVotes = [];  // positionId => nombre de bulletins exprimés
        foreach ($election->positions as $pos) {
            $counters[$pos->id] = [];
            $positionVotes[$pos->id] = 0;
        }

        $ignored = 0;
        foreach ($ballots as $b) {
            try {
                $payload = $this->crypto->decryptBallot([
                    'ciphertext' => $b->ciphertext,
                    'iv' => $b->iv,
                    'authTag' => $b->auth_tag,
                ]);
            } catch (\Throwable $e) {
                // Bulletin corrompu : journalisé et comptabilisé (audit M4),
                // plutôt qu'ignoré silencieusement.
                $ignored++;

                continue;
            }

            foreach (($payload['choices'] ?? []) as $positionId => $choices) {
                if (! isset($counters[$positionId])) {
                    continue;
                }
                if (count($choices) > 0) {
                    $positionVotes[$positionId]++;
                }
                foreach (array_unique($choices) as $candidacyId) {
                    $counters[$positionId][$candidacyId] = ($counters[$positionId][$candidacyId] ?? 0) + 1;
                }
            }
        }

        if ($ignored > 0) {
            Log::warning("[TALLY] {$ignored} bulletin(s) indéchiffrable(s) sur le scrutin {$electionId} (tour {$r}).");
        }

        $positions = [];
        foreach ($election->positions as $pos) {
            $cnt = $counters[$pos->id];
            $totalVotes = $positionVotes[$pos->id];

            $candidates = [];
            foreach ($pos->candidacies as $c) {
                $votes = $cnt[$c->id] ?? 0;
                $candidates[] = [
                    'candidacyId' => $c->id,
                    'userId' => $c->user_id,
                    'name' => "{$c->user->first_name} {$c->user->last_name}",
                    'photoUrl' => $c->photo_url,
                    'votes' => $votes,
                    'percent' => $totalVotes > 0 ? ($votes / $totalVotes) * 100 : 0,
                    'elected' => false,
                ];
            }

            usort($candidates, fn ($a, $b) => $b['votes'] <=> $a['votes']);

            $needsRunoff = false;
            $seatsToFill = min($pos->seats, count($candidates));
            for ($i = 0; $i < $seatsToFill; $i++) {
                if ($election->majority_rule === 'ABSOLUE' && $candidates[$i]['percent'] <= 50) {
                    $needsRunoff = true;
                    break;
                }
                $candidates[$i]['elected'] = true;
            }
            if ($needsRunoff) {
                foreach ($candidates as &$c) {
                    $c['elected'] = false;
                }
                unset($c);
            }

            $positions[] = [
                'positionId' => $pos->id,
                'positionTitle' => $pos->title,
                'seats' => $pos->seats,
                'totalVotes' => $totalVotes,
                'candidates' => $candidates,
                'needsRunoff' => $needsRunoff,
            ];
        }

        return [
            'electionId' => $electionId,
            'round' => $r,
            'ballotsCount' => $ballots->count(),
            'eligibleCount' => $eligibleCount,
            'turnout' => $eligibleCount > 0 ? ($ballots->count() / $eligibleCount) * 100 : 0,
            'positions' => $positions,
            'computedAt' => now()->toISOString(),
        ];
    }

    /**
     * Dépouillement officiel : passe l'élection à DEPOUILLE ou PUBLIE.
     *
     * @return array<string,mixed>
     */
    public function runTally(string $organizationId, string $electionId, bool $publish, ?string $actorId): array
    {
        $election = Election::where('id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");
        abort_unless(in_array($election->status, ['CLOS', 'DEPOUILLE'], true), 403, 'Le dépouillement ne peut être effectué que sur une élection clôturée.');

        $result = $this->computeTally($organizationId, $electionId);

        $election->update(['status' => $publish ? 'PUBLIE' : 'DEPOUILLE']);

        if ($publish) {
            $this->elections->notifyResultsPublished($election);
        }

        $this->audit->log([
            'actorId' => $actorId,
            'action' => $publish ? 'TALLY_PUBLISHED' : 'TALLY_COMPUTED',
            'entity' => 'Election',
            'entityId' => $electionId,
            'meta' => ['round' => $result['round'], 'ballotsCount' => $result['ballotsCount'], 'turnout' => $result['turnout']],
            'organizationId' => $organizationId,
        ]);

        return $result;
    }

    /**
     * Résultats officiels. Correctif audit E2 : un électeur ne voit que les
     * résultats PUBLIÉS ; les rôles de surveillance dès le DÉPOUILLEMENT.
     *
     * @return array<string,mixed>
     */
    public function getResults(string $organizationId, string $electionId, ?string $role = null): array
    {
        $election = Election::where('id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");

        $isOversight = $role !== null && in_array($role, self::OVERSIGHT_ROLES, true);
        $allowed = $isOversight ? ['DEPOUILLE', 'PUBLIE'] : ['PUBLIE'];

        abort_unless(in_array($election->status, $allowed, true), 403, 'Les résultats ne sont pas encore disponibles.');

        return $this->computeTally($organizationId, $electionId);
    }

    /**
     * Crée automatiquement le tour suivant pour les postes sans vainqueur à la
     * majorité absolue. Les candidats non qualifiés — et les postes déjà
     * pourvus — sont écartés via `last_round`. Le scrutin repasse à OUVERT.
     *
     * @return array<string,mixed>
     */
    public function createRunoff(string $organizationId, string $electionId, ?string $actorId): array
    {
        $election = Election::where('id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");
        abort_unless(
            in_array($election->status, ['CLOS', 'DEPOUILLE'], true),
            403,
            'Le second tour ne peut être créé qu\'après la clôture du tour en cours.',
        );
        abort_unless(
            $election->majority_rule === 'ABSOLUE',
            400,
            'Le second tour ne s\'applique qu\'aux scrutins à la majorité absolue.',
        );

        $round = $election->current_round;
        $tally = $this->computeTally($organizationId, $electionId, $round);

        $runoffPositions = [];

        DB::transaction(function () use ($tally, $round, &$runoffPositions) {
            foreach ($tally['positions'] as $pos) {
                if ($pos['needsRunoff']) {
                    // Top (sièges + 1) candidats qualifiés (déjà triés par voix).
                    $qualifyCount = $pos['seats'] + 1;
                    $qualified = array_slice(
                        array_map(fn ($c) => $c['candidacyId'], $pos['candidates']),
                        0,
                        $qualifyCount,
                    );
                    Candidacy::where('position_id', $pos['positionId'])
                        ->whereNull('last_round')
                        ->whereNotIn('id', $qualified)
                        ->update(['last_round' => $round]);
                    $runoffPositions[] = $pos['positionId'];
                } else {
                    // Poste déjà pourvu : ses candidatures sortent des tours suivants.
                    Candidacy::where('position_id', $pos['positionId'])
                        ->whereNull('last_round')
                        ->update(['last_round' => $round]);
                }
            }
        });

        abort_if(
            empty($runoffPositions),
            400,
            'Aucun poste ne nécessite un second tour : tous les sièges ont été pourvus.',
        );

        $newRound = $round + 1;
        $election->update([
            'current_round' => $newRound,
            'total_rounds' => max($election->total_rounds, $newRound),
            'status' => 'OUVERT',
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ELECTION_RUNOFF_CREATED',
            'entity' => 'Election',
            'entityId' => $electionId,
            'meta' => ['round' => $newRound, 'positions' => $runoffPositions],
            'organizationId' => $organizationId,
        ]);

        return [
            'message' => 'Second tour créé.',
            'round' => $newRound,
            'runoffPositions' => $runoffPositions,
        ];
    }
}
