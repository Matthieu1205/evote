<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Position;
use App\Models\User;
use App\Models\VoteRecord;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ElectionService
{
    public function __construct(
        private AuditService $audit,
        private EmailService $email,
    ) {}

    /** Transitions de statut autorisées (parité NestJS). */
    private const TRANSITIONS = [
        'BROUILLON' => ['PLANIFIE'],
        'PLANIFIE' => ['OUVERT'],
        'OUVERT' => ['CLOS', 'PLANIFIE'],
        'CLOS' => [],
        'DEPOUILLE' => ['PUBLIE'],
        'PUBLIE' => [],
    ];

    /**
     * @return array{data:\Illuminate\Support\Collection,meta:array}
     */
    public function findAll(string $organizationId, ?string $status, int $page = 1, int $limit = 20): array
    {
        $query = Election::where('organization_id', $organizationId);
        if ($status) {
            $query->where('status', $status);
        }

        $total = (clone $query)->count();

        $elections = $query
            ->orderByDesc('start_at')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->with(['positions' => fn ($p) => $p->orderBy('order')->withCount('candidacies')])
            ->withCount(['ballots', 'voteRecords', 'positions'])
            ->get();

        return [
            'data' => $elections,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / max($limit, 1)),
            ],
        ];
    }

    public function findOne(string $organizationId, string $id): Election
    {
        $election = Election::where('id', $id)
            ->where('organization_id', $organizationId)
            ->withCount(['ballots', 'voteRecords'])
            ->first();

        abort_if(! $election, 404, "Élection {$id} introuvable.");

        // Les candidatures affichées sont celles en lice pour le tour courant
        // (au second tour, seuls les candidats qualifiés apparaissent).
        $r = $election->current_round;
        $election->load(['positions' => fn ($p) => $p->orderBy('order')
            ->with(['candidacies' => fn ($c) => $c->where('status', 'VALIDEE')
                ->where(fn ($q) => $q->whereNull('last_round')->orWhere('last_round', '>=', $r))
                ->with(['user:id,first_name,last_name,section'])])]);

        return $election;
    }

    private function assertDatesConsistent(
        Carbon $startAt,
        ?Carbon $candidacyEndAt,
        ?Carbon $endAt,
        ?Carbon $resultsPublishAt,
        ?Carbon $candidacyStartAt,
    ): void {
        if ($candidacyStartAt && ! $candidacyEndAt) {
            abort(400, "Indiquez aussi la date de fin du dépôt des candidatures : sans elle, le scrutin peut s'ouvrir automatiquement à tout moment et couper le dépôt des candidatures sans préavis.");
        }
        if ($candidacyEndAt && $startAt->lte($candidacyEndAt)) {
            abort(400, "La date d'ouverture du scrutin (vote) doit être postérieure à la date de clôture des candidatures, sinon le scrutin s'ouvre automatiquement et bloque le dépôt des candidatures.");
        }
        if ($resultsPublishAt && $endAt && $resultsPublishAt->lt($endAt)) {
            abort(400, 'La date de proclamation des résultats doit être postérieure à la date de fin du vote.');
        }
    }

    private function toDate(?string $v): ?Carbon
    {
        return $v ? Carbon::parse($v) : null;
    }

    public function create(string $organizationId, array $dto, ?string $actorId): Election
    {
        $this->assertDatesConsistent(
            Carbon::parse($dto['startAt']),
            $this->toDate($dto['candidacyEndAt'] ?? null),
            Carbon::parse($dto['endAt']),
            $this->toDate($dto['resultsPublishAt'] ?? null),
            $this->toDate($dto['candidacyStartAt'] ?? null),
        );

        $election = Election::create([
            'organization_id' => $organizationId,
            'title' => $dto['title'],
            'description' => $dto['description'] ?? null,
            'majority_rule' => $dto['majorityRule'] ?? 'RELATIVE',
            'total_rounds' => $dto['totalRounds'] ?? 1,
            'current_round' => 1,
            'status' => 'BROUILLON',
            'start_at' => Carbon::parse($dto['startAt']),
            'end_at' => Carbon::parse($dto['endAt']),
            'candidacy_start_at' => $this->toDate($dto['candidacyStartAt'] ?? null),
            'candidacy_end_at' => $this->toDate($dto['candidacyEndAt'] ?? null),
            'results_publish_at' => $this->toDate($dto['resultsPublishAt'] ?? null),
            'eligible_section' => $dto['eligibleSection'] ?? null,
        ]);

        foreach (($dto['positions'] ?? []) as $i => $p) {
            Position::create([
                'organization_id' => $organizationId,
                'election_id' => $election->id,
                'title' => $p['title'],
                'description' => $p['description'] ?? null,
                'seats' => $p['seats'] ?? 1,
                'order' => $p['order'] ?? $i,
            ]);
        }

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ELECTION_CREATED',
            'entity' => 'Election',
            'entityId' => $election->id,
            'organizationId' => $organizationId,
        ]);

        return $election->load(['positions' => fn ($p) => $p->orderBy('order')]);
    }

    public function update(string $organizationId, string $id, array $dto, ?string $actorId): Election
    {
        $current = $this->findOne($organizationId, $id);

        $effStart = isset($dto['startAt']) ? Carbon::parse($dto['startAt']) : $current->start_at;
        $effEnd = isset($dto['endAt']) ? Carbon::parse($dto['endAt']) : $current->end_at;
        $effCandStart = array_key_exists('candidacyStartAt', $dto) ? $this->toDate($dto['candidacyStartAt']) : $current->candidacy_start_at;
        $effCandEnd = array_key_exists('candidacyEndAt', $dto) ? $this->toDate($dto['candidacyEndAt']) : $current->candidacy_end_at;
        $effResults = array_key_exists('resultsPublishAt', $dto) ? $this->toDate($dto['resultsPublishAt']) : $current->results_publish_at;

        $this->assertDatesConsistent($effStart, $effCandEnd, $effEnd, $effResults, $effCandStart);

        $map = [
            'title' => 'title', 'description' => 'description', 'status' => 'status',
            'majorityRule' => 'majority_rule', 'totalRounds' => 'total_rounds',
            'eligibleSection' => 'eligible_section',
        ];
        $data = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $dto)) {
                $data[$col] = $dto[$in];
            }
        }
        if (isset($dto['startAt'])) {
            $data['start_at'] = Carbon::parse($dto['startAt']);
        }
        if (isset($dto['endAt'])) {
            $data['end_at'] = Carbon::parse($dto['endAt']);
        }
        foreach (['candidacyStartAt' => 'candidacy_start_at', 'candidacyEndAt' => 'candidacy_end_at', 'resultsPublishAt' => 'results_publish_at'] as $in => $col) {
            if (array_key_exists($in, $dto)) {
                $data[$col] = $this->toDate($dto[$in]);
            }
        }

        $current->update($data);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ELECTION_UPDATED',
            'entity' => 'Election',
            'entityId' => $id,
            'meta' => ['status' => $dto['status'] ?? null],
            'organizationId' => $organizationId,
        ]);

        return $current->fresh(['positions' => fn ($p) => $p->orderBy('order')]);
    }

    public function remove(string $organizationId, string $id, ?string $actorId): array
    {
        $election = $this->findOne($organizationId, $id);
        abort_if($election->status === 'OUVERT', 400, 'Impossible de supprimer une élection en cours.');

        $election->delete();

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ELECTION_DELETED',
            'entity' => 'Election',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        return ['message' => 'Élection supprimée.'];
    }

    public function addPosition(string $organizationId, string $electionId, array $dto, ?string $actorId): Position
    {
        $election = $this->findOne($organizationId, $electionId);
        abort_unless(in_array($election->status, ['BROUILLON', 'PLANIFIE'], true), 400, "Impossible de modifier les postes d'un scrutin ouvert ou clos.");

        $count = Position::where('election_id', $electionId)->count();
        $pos = Position::create([
            'organization_id' => $organizationId,
            'election_id' => $electionId,
            'title' => $dto['title'],
            'seats' => $dto['seats'] ?? 1,
            'order' => $count,
        ]);

        $this->audit->log(['actorId' => $actorId, 'action' => 'ELECTION_UPDATED', 'entity' => 'Position', 'entityId' => $pos->id, 'organizationId' => $organizationId]);

        return $pos;
    }

    public function updatePosition(string $organizationId, string $electionId, string $posId, array $dto): Position
    {
        $this->findOne($organizationId, $electionId);
        $pos = Position::where('id', $posId)->where('election_id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $pos, 404, 'Poste introuvable.');

        $data = [];
        if (array_key_exists('title', $dto)) {
            $data['title'] = $dto['title'];
        }
        if (array_key_exists('seats', $dto)) {
            $data['seats'] = $dto['seats'];
        }
        $pos->update($data);

        return $pos;
    }

    public function removePosition(string $organizationId, string $electionId, string $posId, ?string $actorId): array
    {
        $election = $this->findOne($organizationId, $electionId);
        abort_unless(in_array($election->status, ['BROUILLON', 'PLANIFIE'], true), 400, "Impossible de supprimer un poste d'un scrutin ouvert ou clos.");

        $pos = Position::where('id', $posId)->where('election_id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $pos, 404, 'Poste introuvable.');

        $cand = Candidacy::where('position_id', $posId)->count();
        abort_if($cand > 0, 400, "Ce poste a {$cand} candidature(s). Retirez-les d'abord.");

        $pos->delete();

        $this->audit->log(['actorId' => $actorId, 'action' => 'ELECTION_UPDATED', 'entity' => 'Position', 'entityId' => $posId, 'organizationId' => $organizationId]);

        return ['message' => 'Poste supprimé.'];
    }

    public function changeStatus(string $organizationId, string $id, string $status, ?string $actorId): Election
    {
        $current = $this->findOne($organizationId, $id);

        $allowed = self::TRANSITIONS[$current->status] ?? [];
        abort_unless(in_array($status, $allowed, true), 400, "Transition de statut invalide : {$current->status} → {$status}.");

        if ($status === 'PLANIFIE' && $current->status === 'OUVERT' && (int) $current->vote_records_count > 0) {
            abort(400, 'Impossible de rouvrir les candidatures : des votes ont déjà été enregistrés.');
        }

        $current->update(['status' => $status]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => "ELECTION_STATUS_{$status}",
            'entity' => 'Election',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        if ($status === 'OUVERT') {
            $this->notifyVotersElectionOpen($organizationId, $current->title);
        }
        if ($status === 'PUBLIE') {
            $this->notifyResultsPublished($current);
        }

        return $current->fresh();
    }

    /**
     * Rappel manuel : envoie un email aux électeurs éligibles n'ayant pas
     * encore voté pour le tour courant.
     *
     * @return array{sent:int}
     */
    public function sendVoteReminders(string $organizationId, string $electionId, ?string $actorId): array
    {
        $election = Election::where('id', $electionId)->where('organization_id', $organizationId)->first();
        abort_if(! $election, 404, "Élection {$electionId} introuvable.");
        abort_unless($election->status === 'OUVERT', 400, "Les rappels ne concernent qu'un scrutin ouvert au vote.");

        $count = $this->dispatchReminders($election);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'VOTE_REMINDERS_SENT',
            'entity' => 'Election',
            'entityId' => $electionId,
            'meta' => ['sent' => $count],
            'organizationId' => $organizationId,
        ]);

        return ['sent' => $count];
    }

    /**
     * Envoie le rappel aux non-votants d'un scrutin. Renvoie le nombre d'envois.
     */
    public function dispatchReminders(Election $election): int
    {
        $round = $election->current_round;

        $votedIds = VoteRecord::where('election_id', $election->id)
            ->where('round', $round)
            ->pluck('user_id')
            ->all();

        $nonVoters = User::where('organization_id', $election->organization_id)
            ->where('role', 'ELECTEUR')
            ->where('is_eligible', true)
            ->where('status', 'ACTIF')
            ->when($election->eligible_section, fn ($q) => $q->where('section', $election->eligible_section))
            ->whereNotIn('id', $votedIds)
            ->get(['email', 'first_name', 'last_name']);

        $loginUrl = rtrim(config('evote.frontend_url'), '/').'/login';
        $deadline = optional($election->end_at)?->locale('fr')->isoFormat('D MMMM YYYY [à] HH:mm');

        foreach ($nonVoters as $voter) {
            $this->email->sendVoteReminder(
                $voter->email,
                "{$voter->first_name} {$voter->last_name}",
                $election->title,
                $deadline,
                $loginUrl,
            );
        }

        Log::info("[RAPPEL] Scrutin « {$election->title} » — {$nonVoters->count()} rappel(s) envoyé(s).");

        return $nonVoters->count();
    }

    /**
     * Notifie les membres actifs que les résultats d'un scrutin sont publiés.
     */
    public function notifyResultsPublished(Election $election): int
    {
        $resultsUrl = rtrim(config('evote.frontend_url'), '/')."/vote/{$election->id}/results";

        $members = User::where('organization_id', $election->organization_id)
            ->where('status', 'ACTIF')
            ->whereIn('role', ['ELECTEUR', 'CANDIDAT'])
            ->get(['email', 'first_name', 'last_name']);

        foreach ($members as $m) {
            $this->email->sendResultsPublished(
                $m->email,
                "{$m->first_name} {$m->last_name}",
                $election->title,
                $resultsUrl,
            );
        }

        Log::info("[RÉSULTATS] Scrutin « {$election->title} » publié — {$members->count()} membre(s) notifié(s).");

        return $members->count();
    }

    private function notifyVotersElectionOpen(string $organizationId, string $electionTitle): void
    {
        $loginUrl = rtrim(config('evote.frontend_url'), '/').'/login';

        $voters = User::where('organization_id', $organizationId)
            ->where('is_eligible', true)
            ->where('status', 'ACTIF')
            ->where('role', 'ELECTEUR')
            ->get(['email', 'first_name', 'last_name']);

        Log::info("[NOTIF] Scrutin « {$electionTitle} » ouvert — {$voters->count()} électeur(s) notifié(s).");

        foreach ($voters as $voter) {
            $this->email->sendElectionOpen(
                $voter->email,
                "{$voter->first_name} {$voter->last_name}",
                $electionTitle,
                $loginUrl,
            );
        }
    }
}
