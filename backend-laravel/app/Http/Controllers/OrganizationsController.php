<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateOrganizationRequest;
use App\Http\Requests\CreateOrgAdminRequest;
use App\Http\Requests\RegisterOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationFullResource;
use App\Http\Resources\UserAdminResource;
use App\Services\OrganizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationsController extends Controller
{
    public function __construct(private OrganizationService $orgs) {}

    // ─── Public ───────────────────────────────────────────────────────────

    public function lookup(Request $request): JsonResponse
    {
        $slug = (string) $request->query('slug', '');

        return response()->json($this->orgs->lookup($slug));
    }

    public function register(RegisterOrganizationRequest $request): JsonResponse
    {
        return response()->json($this->orgs->register($request->validated()));
    }

    // ─── SUPER_ADMIN ──────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        return response()->json(
            OrganizationFullResource::collection($this->orgs->findAll())
        );
    }

    public function show(string $id): OrganizationFullResource
    {
        return new OrganizationFullResource($this->orgs->findOne($id));
    }

    public function store(CreateOrganizationRequest $request): OrganizationFullResource
    {
        return new OrganizationFullResource(
            $this->orgs->create($request->validated(), $request->user()->id)
        );
    }

    public function update(UpdateOrganizationRequest $request, string $id): OrganizationFullResource
    {
        return new OrganizationFullResource(
            $this->orgs->update($id, $request->validated(), $request->user()->id)
        );
    }

    public function createAdmin(CreateOrgAdminRequest $request, string $id): JsonResponse
    {
        $result = $this->orgs->createAdmin($id, $request->validated(), $request->user()->id);

        return response()->json(array_merge(
            (new UserAdminResource($result['user']))->resolve($request),
            ['tempPassword' => $result['tempPassword']],
        ));
    }

    // ─── ADMIN (sa propre organisation) ───────────────────────────────────

    public function updateOwn(UpdateOrganizationRequest $request): OrganizationFullResource
    {
        $user = $request->user();

        return new OrganizationFullResource(
            $this->orgs->updateOwn($user->organization_id, $request->validated(), $user->id)
        );
    }
}
