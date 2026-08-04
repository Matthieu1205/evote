<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Candidature telle qu'incluse dans le détail d'une élection
 * (parité avec l'include Prisma : user { id, firstName, lastName, section }).
 */
class CandidacyBriefResource extends JsonResource
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
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'firstName' => $this->user->first_name,
                'lastName' => $this->user->last_name,
                'section' => $this->user->section,
            ]),
        ];
    }
}
