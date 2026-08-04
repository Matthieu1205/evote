<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateCandidacyRequest;
use App\Http\Requests\CreateConditionRequest;
use App\Http\Requests\ReviewCandidacyRequest;
use App\Http\Requests\UpdateCandidacyRequest;
use App\Http\Requests\UpdateConditionRequest;
use App\Http\Resources\CandidacyConditionResource;
use App\Http\Resources\CandidacyResource;
use App\Services\CandidacyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CandidaciesController extends Controller
{
    public function __construct(private CandidacyService $candidacies) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // ELECTEUR et CANDIDAT ne voient que leurs propres candidatures.
        $restrictToUser = in_array($user->role, ['ELECTEUR', 'CANDIDAT'], true)
            ? $user->id
            : null;

        $result = $this->candidacies->findAll($user->organization_id, [
            'positionId' => $request->query('positionId'),
            'electionId' => $request->query('electionId'),
            'status' => $request->query('status'),
            'userId' => $restrictToUser,
            'page' => $request->query('page'),
            'limit' => $request->query('limit'),
        ]);

        return response()->json([
            'data' => CandidacyResource::collection($result['data']),
            'meta' => $result['meta'],
        ]);
    }

    // ─── Conditions (avant {id} pour éviter le conflit de route) ─────────────

    public function getConditions(Request $request): JsonResponse
    {
        return response()->json(
            CandidacyConditionResource::collection(
                $this->candidacies->getConditions($request->user()->organization_id)
            )
        );
    }

    public function createCondition(CreateConditionRequest $request): CandidacyConditionResource
    {
        return new CandidacyConditionResource(
            $this->candidacies->createCondition($request->user()->organization_id, $request->validated())
        );
    }

    public function updateCondition(UpdateConditionRequest $request, string $id): CandidacyConditionResource
    {
        return new CandidacyConditionResource(
            $this->candidacies->updateCondition($request->user()->organization_id, $id, $request->validated())
        );
    }

    public function deleteCondition(Request $request, string $id): JsonResponse
    {
        return response()->json(
            $this->candidacies->deleteCondition($request->user()->organization_id, $id)
        );
    }

    // ─── Candidatures ─────────────────────────────────────────────────────────

    public function show(Request $request, string $id): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->findOne($user->organization_id, $id, $user->id, $user->role)
        );
    }

    public function store(CreateCandidacyRequest $request): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->create($user->organization_id, $request->validated(), $user->id)
        );
    }

    public function validateCandidacy(ReviewCandidacyRequest $request, string $id): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->validateCandidacy($user->organization_id, $id, $request->validated()['reviewNote'] ?? null, $user->id)
        );
    }

    public function reject(ReviewCandidacyRequest $request, string $id): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->reject($user->organization_id, $id, $request->validated()['reviewNote'] ?? null, $user->id)
        );
    }

    public function update(UpdateCandidacyRequest $request, string $id): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->updateOwn($user->organization_id, $id, $request->validated(), $user->id)
        );
    }

    public function withdraw(Request $request, string $id): CandidacyResource
    {
        $user = $request->user();

        return new CandidacyResource(
            $this->candidacies->withdraw($user->organization_id, $id, $user->id)
        );
    }
}
