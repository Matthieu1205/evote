<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserAdminResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UsersController extends Controller
{
    public function __construct(private UserService $users) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $result = $this->users->findAll($user->organization_id, [
            'role' => $request->query('role'),
            'status' => $request->query('status'),
            'search' => $request->query('search'),
            'page' => $request->query('page'),
            'limit' => $request->query('limit'),
        ]);

        return response()->json([
            'data' => UserAdminResource::collection($result['data']),
            'meta' => $result['meta'],
        ]);
    }

    public function importCsv(Request $request): JsonResponse
    {
        $file = $request->file('file');
        abort_if(! $file, 400, 'Fichier CSV requis.');

        $csvText = file_get_contents($file->getRealPath());

        return response()->json(
            $this->users->importCsv($request->user()->organization_id, $csvText, $request->user()->id)
        );
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $csv = $this->users->exportCsv($request->user()->organization_id);
        $filename = 'membres-evote-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($csv) {
            // BOM UTF-8 pour un affichage correct des accents dans Excel.
            echo "\xEF\xBB\xBF".$csv;
        }, $filename, ['Content-Type' => 'text/csv; charset=utf-8']);
    }

    public function show(Request $request, string $id): UserAdminResource
    {
        return new UserAdminResource(
            $this->users->findOne($request->user()->organization_id, $id)
        );
    }

    public function store(CreateUserRequest $request): UserAdminResource
    {
        $user = $request->user();

        return new UserAdminResource(
            $this->users->create($user->organization_id, $request->validated(), $user->id)
        );
    }

    public function update(UpdateUserRequest $request, string $id): UserAdminResource
    {
        $user = $request->user();

        return new UserAdminResource(
            $this->users->update($user->organization_id, $id, $request->validated(), $user->id)
        );
    }

    public function resetPassword(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->users->resetPassword($user->organization_id, $id, $user->id)
        );
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->users->remove($user->organization_id, $id, $user->id)
        );
    }
}
