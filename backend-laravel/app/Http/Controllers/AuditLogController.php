<?php

namespace App\Http\Controllers;

use App\Http\Resources\AuditLogResource;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(private AuditLogService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->audit->findAll($request->user()->organization_id, [
            'action' => $request->query('action'),
            'actorId' => $request->query('actorId'),
            'entity' => $request->query('entity'),
            'entityId' => $request->query('entityId'),
            'from' => $request->query('from'),
            'to' => $request->query('to'),
            'page' => $request->query('page'),
            'limit' => $request->query('limit'),
        ]);

        return response()->json([
            'data' => AuditLogResource::collection($result['data']),
            'meta' => $result['meta'],
        ]);
    }
}
