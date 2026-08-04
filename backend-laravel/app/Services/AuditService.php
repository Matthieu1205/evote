<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditService
{
    /**
     * Enregistre une entrée de journal d'audit. Ne fait jamais échouer
     * l'action métier appelante (best-effort).
     *
     * @param  array<string,mixed>  $data
     */
    public function log(array $data): void
    {
        try {
            AuditLog::create([
                'organization_id' => $data['organizationId'] ?? null,
                'actor_id' => $data['actorId'] ?? null,
                'action' => $data['action'],
                'entity' => $data['entity'] ?? null,
                'entity_id' => $data['entityId'] ?? null,
                'meta' => $data['meta'] ?? null,
                'ip' => $data['ip'] ?? null,
                'created_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::error('[AUDIT] Échec écriture journal : '.$e->getMessage());
        }
    }
}
