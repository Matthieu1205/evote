<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PositionResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'electionId' => $this->election_id,
            'organizationId' => $this->organization_id,
            'title' => $this->title,
            'description' => $this->description,
            'seats' => $this->seats,
            'order' => $this->order,
            'candidacies' => CandidacyBriefResource::collection(
                $this->whenLoaded('candidacies')
            ),
            // Reproduit l'objet _count de Prisma : { candidacies: N }
            '_count' => $this->when(
                $this->candidacies_count !== null,
                fn () => ['candidacies' => (int) $this->candidacies_count],
            ),
        ];
    }
}
