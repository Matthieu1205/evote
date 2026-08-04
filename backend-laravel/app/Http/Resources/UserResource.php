<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Format de sortie identique au getMe() NestJS (clés camelCase).
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ordreNumber' => $this->ordre_number,
            'email' => $this->email,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'role' => $this->role,
            'status' => $this->status,
            'isEligible' => $this->is_eligible,
            'section' => $this->section,
            'region' => $this->region,
            'phone' => $this->phone,
            'photoUrl' => $this->photo_url,
            'membershipDate' => optional($this->membership_date)->toDateString(),
            'duesUpToDate' => $this->dues_up_to_date,
            'mustChangePassword' => $this->must_change_password,
            'createdAt' => optional($this->created_at)->toISOString(),
            'organization' => $this->whenLoaded(
                'organization',
                fn () => new OrganizationResource($this->organization),
            ),
        ];
    }
}
