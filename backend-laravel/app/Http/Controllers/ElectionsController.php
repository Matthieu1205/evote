<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeStatusRequest;
use App\Http\Requests\CreateElectionRequest;
use App\Http\Requests\UpdateElectionRequest;
use App\Http\Resources\ElectionResource;
use App\Http\Resources\PositionResource;
use App\Services\ElectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ElectionsController extends Controller
{
    public function __construct(private ElectionService $elections) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $result = $this->elections->findAll(
            $user->organization_id,
            $request->query('status'),
            (int) ($request->query('page', 1)),
            (int) ($request->query('limit', 20)),
        );

        return response()->json([
            'data' => ElectionResource::collection($result['data']),
            'meta' => $result['meta'],
        ]);
    }

    public function show(Request $request, string $id): ElectionResource
    {
        return new ElectionResource(
            $this->elections->findOne($request->user()->organization_id, $id)
        );
    }

    public function store(CreateElectionRequest $request): ElectionResource
    {
        $user = $request->user();

        return new ElectionResource(
            $this->elections->create($user->organization_id, $request->validated(), $user->id)
        );
    }

    public function update(UpdateElectionRequest $request, string $id): ElectionResource
    {
        $user = $request->user();

        return new ElectionResource(
            $this->elections->update($user->organization_id, $id, $request->validated(), $user->id)
        );
    }

    public function changeStatus(ChangeStatusRequest $request, string $id): ElectionResource
    {
        $user = $request->user();

        return new ElectionResource(
            $this->elections->changeStatus($user->organization_id, $id, $request->validated()['status'], $user->id)
        );
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->elections->remove($user->organization_id, $id, $user->id)
        );
    }

    public function remind(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->elections->sendVoteReminders($user->organization_id, $id, $user->id)
        );
    }

    public function addPosition(Request $request, string $id): PositionResource
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => ['required', 'string'],
            'seats' => ['nullable', 'integer', 'min:1'],
        ]);

        return new PositionResource(
            $this->elections->addPosition($user->organization_id, $id, $data, $user->id)
        );
    }

    public function updatePosition(Request $request, string $id, string $posId): PositionResource
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => ['sometimes', 'string'],
            'seats' => ['sometimes', 'integer', 'min:1'],
        ]);

        return new PositionResource(
            $this->elections->updatePosition($user->organization_id, $id, $posId, $data)
        );
    }

    public function removePosition(Request $request, string $id, string $posId): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->elections->removePosition($user->organization_id, $id, $posId, $user->id)
        );
    }
}
