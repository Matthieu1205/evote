<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Candidature complète (liste, détail, validation) — inclut user et position
 * avec l'élection résumée, à l'identique de l'include Prisma.
 */
class CandidacyResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'positionId' => $this->position_id,
            'userId' => $this->user_id,
            'status' => $this->status,
            'profession' => $this->profession,
            'currentRole' => $this->current_role,
            'employer' => $this->employer,
            'yearsExperience' => $this->years_experience,
            'education' => $this->education,
            'age' => $this->age,
            'biography' => $this->biography,
            'pastRoles' => $this->past_roles,
            'motivation' => $this->motivation,
            'photoUrl' => $this->photo_url,
            'videoUrl' => $this->video_url,
            'program' => $this->program,
            'documentUrl' => $this->document_url,
            'reviewNote' => $this->review_note,
            'conditionsAcceptedAt' => optional($this->conditions_accepted_at)->toISOString(),
            'submittedAt' => optional($this->submitted_at)->toISOString(),
            'reviewedAt' => optional($this->reviewed_at)->toISOString(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'firstName' => $this->user->first_name,
                'lastName' => $this->user->last_name,
                'email' => $this->user->email,
                'ordreNumber' => $this->user->ordre_number,
                'section' => $this->user->section,
            ]),
            'position' => $this->whenLoaded('position', fn () => [
                'id' => $this->position->id,
                'electionId' => $this->position->election_id,
                'organizationId' => $this->position->organization_id,
                'title' => $this->position->title,
                'description' => $this->position->description,
                'seats' => $this->position->seats,
                'order' => $this->position->order,
                'election' => $this->position->relationLoaded('election') && $this->position->election
                    ? [
                        'id' => $this->position->election->id,
                        'title' => $this->position->election->title,
                        'status' => $this->position->election->status,
                    ]
                    : null,
            ]),
        ];
    }
}
