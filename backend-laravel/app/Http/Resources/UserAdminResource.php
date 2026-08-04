<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Membre tel que renvoyé par la gestion des membres (findAll / findOne) —
 * parité avec le select Prisma (sans passwordHash).
 */
class UserAdminResource extends JsonResource
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
            'membershipDate' => optional($this->membership_date)->toDateString(),
            'duesUpToDate' => $this->dues_up_to_date,
            'createdAt' => optional($this->created_at)->toISOString(),
            'updatedAt' => optional($this->updated_at)->toISOString(),
        ];
    }
}
