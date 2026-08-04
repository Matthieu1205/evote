<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Carbon;

class AuditLogService
{
    /**
     * @return array{data:\Illuminate\Support\Collection,meta:array}
     */
    public function findAll(string $organizationId, array $params): array
    {
        $page = (int) ($params['page'] ?? 1);
        $limit = (int) ($params['limit'] ?? 50);

        $query = AuditLog::where('organization_id', $organizationId);

        if (! empty($params['action'])) {
            $query->where('action', 'like', '%'.$params['action'].'%');
        }
        if (! empty($params['actorId'])) {
            $query->where('actor_id', $params['actorId']);
        }
        if (! empty($params['entity'])) {
            $query->where('entity', $params['entity']);
        }
        if (! empty($params['entityId'])) {
            $query->where('entity_id', $params['entityId']);
        }
        if (! empty($params['from'])) {
            $query->where('created_at', '>=', Carbon::parse($params['from']));
        }
        if (! empty($params['to'])) {
            $query->where('created_at', '<=', Carbon::parse($params['to']));
        }

        $total = (clone $query)->count();

        $logs = $query->orderByDesc('created_at')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->with(['actor:id,first_name,last_name,ordre_number,role'])
            ->get();

        return [
            'data' => $logs,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / max($limit, 1)),
            ],
        ];
    }
}
