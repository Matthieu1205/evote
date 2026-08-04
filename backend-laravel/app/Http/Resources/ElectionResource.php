<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ElectionResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organizationId' => $this->organization_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'majorityRule' => $this->majority_rule,
            'totalRounds' => $this->total_rounds,
            'currentRound' => $this->current_round,
            'startAt' => optional($this->start_at)->toISOString(),
            'endAt' => optional($this->end_at)->toISOString(),
            'candidacyStartAt' => optional($this->candidacy_start_at)->toISOString(),
            'candidacyEndAt' => optional($this->candidacy_end_at)->toISOString(),
            'resultsPublishAt' => optional($this->results_publish_at)->toISOString(),
            'eligibleSection' => $this->eligible_section,
            'createdAt' => optional($this->created_at)->toISOString(),
            'updatedAt' => optional($this->updated_at)->toISOString(),
            'positions' => PositionResource::collection(
                $this->whenLoaded('positions')
            ),
            // Reproduit l'objet _count de Prisma : { ballots, voteRecords }
            '_count' => $this->when(
                $this->ballots_count !== null || $this->vote_records_count !== null || $this->positions_count !== null,
                fn () => [
                    'ballots' => (int) ($this->ballots_count ?? 0),
                    'voteRecords' => (int) ($this->vote_records_count ?? 0),
                    'positions' => (int) ($this->positions_count ?? 0),
                ],
            ),
        ];
    }
}
