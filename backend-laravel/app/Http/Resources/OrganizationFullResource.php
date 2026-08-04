<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Organisation complète (gestion plateforme) — inclut _count.users.
 */
class OrganizationFullResource extends JsonResource
{
    /**
     * @return array<string,mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'memberLabel' => $this->member_label,
            'logoUrl' => $this->logo_url,
            'primaryColor' => $this->primary_color,
            'isPlatform' => $this->is_platform,
            'createdAt' => optional($this->created_at)->toISOString(),
            'updatedAt' => optional($this->updated_at)->toISOString(),
            '_count' => $this->when(
                $this->users_count !== null,
                fn () => ['users' => (int) $this->users_count],
            ),
        ];
    }
}
