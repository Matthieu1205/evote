<?php

namespace App\Http\Controllers;

use App\Http\Resources\AuditLogResource;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboard) {}

    public function stats(Request $request): JsonResponse
    {
        return response()->json(
            $this->dashboard->getStats($request->user()->organization_id)
        );
    }

    public function charts(Request $request): JsonResponse
    {
        return response()->json(
            $this->dashboard->getCharts($request->user()->organization_id)
        );
    }

    public function liveScores(Request $request): JsonResponse
    {
        return response()->json(
            $this->dashboard->getLiveScores($request->user()->organization_id)
        );
    }

    public function recentActivity(Request $request): JsonResponse
    {
        $limit = (int) ($request->query('limit', 10));

        return response()->json(
            AuditLogResource::collection(
                $this->dashboard->getRecentActivity($request->user()->organization_id, $limit)
            )
        );
    }
}
