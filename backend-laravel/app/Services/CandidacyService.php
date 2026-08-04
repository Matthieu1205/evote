<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\CandidacyCondition;
use App\Models\Position;
use Illuminate\Support\Carbon;

class CandidacyService
{
    public function __construct(
        private AuditService $audit,
        private EmailService $email,
    ) {}

    /** Include standard : user résumé + position avec élection résumée. */
    private function withRelations($query)
    {
        return $query->with([
            'user:id,first_name,last_name,email,ordre_number,section',
            'position' => fn ($p) => $p->with('election:id,title,status'),
        ]);
    }

    /**
     * @return array{data:\Illuminate\Support\Collection,meta:array}
     */
    public function findAll(string $organizationId, array $params): array
    {
        $page = (int) ($params['page'] ?? 1);
        $limit = (int) ($params['limit'] ?? 50);

        $query = Candidacy::where('organization_id', $organizationId);

        if (! empty($params['positionId'])) {
            $query->where('position_id', $params['positionId']);
        }
        if (! empty($params['status'])) {
            $query->where('status', $params['status']);
        }
        if (! empty($params['userId'])) {
            $query->where('user_id', $params['userId']);
        }
        if (! empty($params['electionId'])) {
            $query->whereHas('position', fn ($p) => $p->where('election_id', $params['electionId']));
        }

        $total = (clone $query)->count();

        $candidacies = $this->withRelations($query)
            ->orderByDesc('submitted_at')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        return [
            'data' => $candidacies,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / max($limit, 1)),
            ],
        ];
    }

    private function findByIdOrThrow(string $organizationId, string $id): Candidacy
    {
        $c = $this->withRelations(
            Candidacy::where('id', $id)->where('organization_id', $organizationId)
        )->first();

        abort_if(! $c, 404, "Candidature {$id} introuvable.");

        return $c;
    }

    public function findOne(string $organizationId, string $id, string $requesterId, string $requesterRole): Candidacy
    {
        $c = $this->findByIdOrThrow($organizationId, $id);

        $isReviewer = in_array($requesterRole, ['ADMIN', 'COMMISSION'], true);
        $isOwner = $c->user_id === $requesterId;

        abort_if(
            $c->status !== 'VALIDEE' && ! $isReviewer && ! $isOwner,
            403,
            "Cette candidature n'est pas encore visible.",
        );

        return $c;
    }

    public function create(string $organizationId, array $dto, string $userId): Candidacy
    {
        $position = Position::where('id', $dto['positionId'])
            ->where('organization_id', $organizationId)
            ->with('election')
            ->first();
        abort_if(! $position, 404, 'Poste introuvable.');

        $election = $position->election;
        abort_unless(
            in_array($election->status, ['PLANIFIE', 'BROUILLON'], true),
            403,
            'Les candidatures ne sont plus ouvertes pour cette élection.',
        );

        $now = Carbon::now();
        if ($election->candidacy_start_at && $now->lt($election->candidacy_start_at)) {
            $d = $election->candidacy_start_at->locale('fr')->isoFormat('D MMMM YYYY');
            abort(403, "Le dépôt des candidatures n'ouvrira que le {$d}.");
        }
        if ($election->candidacy_end_at && $now->gt($election->candidacy_end_at)) {
            $d = $election->candidacy_end_at->locale('fr')->isoFormat('D MMMM YYYY');
            abort(403, "Le délai de dépôt des candidatures est clôturé depuis le {$d}.");
        }

        $exists = Candidacy::where('position_id', $dto['positionId'])
            ->where('user_id', $userId)
            ->exists();
        abort_if($exists, 409, 'Vous avez déjà soumis une candidature pour ce poste.');

        // Attestation sur l'honneur : si l'organisation a défini des conditions
        // de candidature, le candidat doit certifier les remplir.
        $hasConditions = CandidacyCondition::where('organization_id', $organizationId)->exists();
        $accepted = ! empty($dto['acceptConditions']);
        abort_if(
            $hasConditions && ! $accepted,
            400,
            'Vous devez certifier remplir les conditions de candidature pour déposer.',
        );

        $candidacy = Candidacy::create([
            'organization_id' => $organizationId,
            'position_id' => $dto['positionId'],
            'user_id' => $userId,
            'status' => 'SOUMISE',
            'profession' => $dto['profession'] ?? null,
            'current_role' => $dto['currentRole'] ?? null,
            'employer' => $dto['employer'] ?? null,
            'years_experience' => $dto['yearsExperience'] ?? null,
            'education' => $dto['education'] ?? null,
            'age' => $dto['age'] ?? null,
            'biography' => $dto['biography'] ?? null,
            'past_roles' => $dto['pastRoles'] ?? null,
            'motivation' => $dto['motivation'] ?? null,
            'photo_url' => $dto['photoUrl'] ?? null,
            'video_url' => $dto['videoUrl'] ?? null,
            'program' => $dto['program'] ?? null,
            'document_url' => $dto['documentUrl'] ?? null,
            'conditions_accepted_at' => $accepted ? now() : null,
            'submitted_at' => now(),
        ]);

        $this->audit->log([
            'actorId' => $userId,
            'action' => 'CANDIDACY_SUBMITTED',
            'entity' => 'Candidacy',
            'entityId' => $candidacy->id,
            'organizationId' => $organizationId,
        ]);

        return $this->findByIdOrThrow($organizationId, $candidacy->id);
    }

    public function validateCandidacy(string $organizationId, string $id, ?string $reviewNote, string $actorId): Candidacy
    {
        $c = $this->findByIdOrThrow($organizationId, $id);
        $c->update([
            'status' => 'VALIDEE',
            'reviewed_at' => now(),
            'review_note' => $reviewNote,
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'CANDIDACY_VALIDATED',
            'entity' => 'Candidacy',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        $fresh = $this->findByIdOrThrow($organizationId, $id);
        if ($fresh->user && $fresh->position) {
            $this->email->sendCandidacyStatus(
                $fresh->user->email,
                "{$fresh->user->first_name} {$fresh->user->last_name}",
                $fresh->position->title,
                'VALIDEE',
            );
        }

        return $fresh;
    }

    public function reject(string $organizationId, string $id, ?string $reviewNote, string $actorId): Candidacy
    {
        $c = $this->findByIdOrThrow($organizationId, $id);
        $c->update([
            'status' => 'REJETEE',
            'reviewed_at' => now(),
            'review_note' => $reviewNote,
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'CANDIDACY_REJECTED',
            'entity' => 'Candidacy',
            'entityId' => $id,
            'meta' => ['reviewNote' => $reviewNote],
            'organizationId' => $organizationId,
        ]);

        $fresh = $this->findByIdOrThrow($organizationId, $id);
        if ($fresh->user && $fresh->position) {
            $this->email->sendCandidacyStatus(
                $fresh->user->email,
                "{$fresh->user->first_name} {$fresh->user->last_name}",
                $fresh->position->title,
                'REJETEE',
                $reviewNote,
            );
        }

        return $fresh;
    }

    /**
     * Modifie sa propre candidature tant qu'elle est encore SOUMISE.
     */
    public function updateOwn(string $organizationId, string $id, array $dto, string $userId): Candidacy
    {
        $c = $this->findByIdOrThrow($organizationId, $id);
        abort_if($c->user_id !== $userId, 403, 'Vous ne pouvez modifier que votre propre candidature.');
        abort_if($c->status !== 'SOUMISE', 403, 'Seule une candidature en attente peut être modifiée.');

        $map = [
            'profession' => 'profession', 'currentRole' => 'current_role', 'employer' => 'employer',
            'yearsExperience' => 'years_experience', 'education' => 'education',
            'age' => 'age', 'biography' => 'biography', 'pastRoles' => 'past_roles',
            'motivation' => 'motivation', 'photoUrl' => 'photo_url', 'videoUrl' => 'video_url',
            'program' => 'program', 'documentUrl' => 'document_url',
        ];
        $data = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $dto)) {
                $data[$col] = $dto[$in];
            }
        }
        $c->update($data);

        $this->audit->log([
            'actorId' => $userId,
            'action' => 'CANDIDACY_UPDATED',
            'entity' => 'Candidacy',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        return $this->findByIdOrThrow($organizationId, $id);
    }

    public function withdraw(string $organizationId, string $id, string $userId): Candidacy
    {
        $c = $this->findByIdOrThrow($organizationId, $id);
        abort_if($c->user_id !== $userId, 403, 'Vous ne pouvez retirer que votre propre candidature.');
        abort_if($c->status !== 'SOUMISE', 403, 'Seule une candidature soumise peut être retirée.');

        $c->update(['status' => 'RETIREE']);

        $this->audit->log([
            'actorId' => $userId,
            'action' => 'CANDIDACY_WITHDRAWN',
            'entity' => 'Candidacy',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        return $this->findByIdOrThrow($organizationId, $id);
    }

    // ─── Conditions de candidature ───────────────────────────────────────────

    public function getConditions(string $organizationId)
    {
        return CandidacyCondition::where('organization_id', $organizationId)
            ->orderBy('order')
            ->orderBy('created_at')
            ->get();
    }

    public function createCondition(string $organizationId, array $dto): CandidacyCondition
    {
        return CandidacyCondition::create([
            'organization_id' => $organizationId,
            'text' => $dto['text'],
            'order' => $dto['order'] ?? 0,
            'created_at' => now(),
        ]);
    }

    public function updateCondition(string $organizationId, string $id, array $dto): CandidacyCondition
    {
        $cond = CandidacyCondition::where('id', $id)->where('organization_id', $organizationId)->first();
        abort_if(! $cond, 404, "Condition {$id} introuvable.");

        $data = [];
        if (array_key_exists('text', $dto)) {
            $data['text'] = $dto['text'];
        }
        if (array_key_exists('order', $dto)) {
            $data['order'] = $dto['order'];
        }
        $cond->update($data);

        return $cond;
    }

    public function deleteCondition(string $organizationId, string $id): array
    {
        $cond = CandidacyCondition::where('id', $id)->where('organization_id', $organizationId)->first();
        abort_if(! $cond, 404, "Condition {$id} introuvable.");
        $cond->delete();

        return ['message' => 'Condition supprimée.'];
    }
}
