<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organizationId' => $this->organization_id,
            'actorId' => $this->actor_id,
            'action' => $this->action,
            'entity' => $this->entity,
            'entityId' => $this->entity_id,
            'meta' => $this->meta,
            'ip' => $this->ip,
            'createdAt' => optional($this->created_at)->toISOString(),
            'actor' => $this->whenLoaded('actor', fn () => $this->actor ? [
                'id' => $this->actor->id,
                'firstName' => $this->actor->first_name,
                'lastName' => $this->actor->last_name,
                'ordreNumber' => $this->actor->ordre_number,
                'role' => $this->actor->role,
            ] : null),
        ];
    }
}
