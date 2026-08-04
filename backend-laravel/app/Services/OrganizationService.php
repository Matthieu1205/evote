<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OrganizationService
{
    public function __construct(
        private AuditService $audit,
        private CryptoService $crypto,
        private EmailService $email,
    ) {}

    /**
     * @return array{name:string,logoUrl:?string}
     */
    public function lookup(string $slug): array
    {
        $org = Organization::where('slug', $slug)->where('is_platform', false)->first();
        abort_if(! $org, 404, 'Organisation introuvable.');

        return ['name' => $org->name, 'logoUrl' => $org->logo_url];
    }

    public function findAll()
    {
        return Organization::where('is_platform', false)
            ->orderByDesc('created_at')
            ->withCount('users')
            ->get();
    }

    public function findOne(string $id): Organization
    {
        $org = Organization::where('id', $id)->where('is_platform', false)
            ->withCount('users')
            ->first();
        abort_if(! $org, 404, 'Organisation introuvable.');

        return $org;
    }

    /**
     * Inscription publique : crée l'organisation + le premier compte ADMIN.
     *
     * @return array{message:string,organizationSlug:string}
     */
    public function register(array $dto): array
    {
        abort_if(Organization::where('slug', $dto['slug'])->exists(), 409, 'Ce slug est déjà utilisé. Choisissez-en un autre.');
        abort_if(User::where('email', $dto['adminEmail'])->exists(), 409, 'Cette adresse email est déjà associée à un compte.');

        $org = Organization::create([
            'slug' => $dto['slug'],
            'name' => $dto['name'],
            'member_label' => $dto['memberLabel'] ?? 'Numéro de membre',
            'primary_color' => $dto['primaryColor'] ?? '#059669',
            'logo_url' => $dto['logoUrl'] ?? null,
        ]);

        $ordreNumber = 'ADMIN-'.strtoupper(substr($org->id, -6));

        $user = User::create([
            'organization_id' => $org->id,
            'ordre_number' => $ordreNumber,
            'email' => $dto['adminEmail'],
            'first_name' => $dto['adminFirstName'],
            'last_name' => $dto['adminLastName'],
            'password_hash' => Hash::make($dto['adminPassword']),
            'role' => 'ADMIN',
            'status' => 'ACTIF',
            'is_eligible' => false,
        ]);

        $this->audit->log([
            'actorId' => $user->id,
            'action' => 'ORGANIZATION_CREATED',
            'entity' => 'Organization',
            'entityId' => $org->id,
            'organizationId' => $org->id,
        ]);

        $this->email->sendWelcome($user->email, "{$user->first_name} {$user->last_name}", $user->ordre_number);

        return ['message' => 'Organisation créée avec succès.', 'organizationSlug' => $org->slug];
    }

    public function create(array $dto, ?string $actorId): Organization
    {
        abort_if(Organization::where('slug', $dto['slug'])->exists(), 409, 'Ce slug est déjà utilisé.');

        $org = Organization::create([
            'slug' => $dto['slug'],
            'name' => $dto['name'],
            'member_label' => $dto['memberLabel'] ?? 'Numéro de membre',
            'logo_url' => $dto['logoUrl'] ?? null,
            'primary_color' => $dto['primaryColor'] ?? null,
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ORGANIZATION_CREATED',
            'entity' => 'Organization',
            'entityId' => $org->id,
        ]);

        return $org->loadCount('users');
    }

    public function update(string $id, array $dto, ?string $actorId): Organization
    {
        $org = $this->findOne($id);
        $org->update($this->mapBranding($dto));

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ORGANIZATION_UPDATED',
            'entity' => 'Organization',
            'entityId' => $id,
        ]);

        return $org->loadCount('users');
    }

    public function updateOwn(string $organizationId, array $dto, ?string $actorId): Organization
    {
        $org = Organization::findOrFail($organizationId);
        $org->update($this->mapBranding($dto));

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ORGANIZATION_UPDATED',
            'entity' => 'Organization',
            'entityId' => $organizationId,
            'organizationId' => $organizationId,
        ]);

        return $org->loadCount('users');
    }

    /**
     * @return array{user:User,tempPassword:string}
     */
    public function createAdmin(string $organizationId, array $dto, ?string $actorId): array
    {
        $this->findOne($organizationId);

        $existing = User::where('organization_id', $organizationId)
            ->where(fn ($q) => $q->where('email', $dto['email'])->orWhere('ordre_number', $dto['ordreNumber']))
            ->exists();
        abort_if($existing, 409, "Email ou numéro d'ordre déjà utilisé.");

        $tempPassword = $this->crypto->randomPassword(12);

        $user = User::create([
            'organization_id' => $organizationId,
            'ordre_number' => $dto['ordreNumber'],
            'email' => $dto['email'],
            'first_name' => $dto['firstName'],
            'last_name' => $dto['lastName'],
            'password_hash' => Hash::make($tempPassword),
            'role' => 'ADMIN',
            'status' => 'ACTIF',
            'is_eligible' => false,
            'must_change_password' => true,
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'ORG_ADMIN_CREATED',
            'entity' => 'User',
            'entityId' => $user->id,
            'organizationId' => $organizationId,
        ]);

        if (! app()->environment('production')) {
            Log::info("[WELCOME] Admin {$user->email} — mot de passe temporaire : {$tempPassword}");
        }
        $this->email->sendWelcome($user->email, "{$user->first_name} {$user->last_name}", $user->ordre_number, $tempPassword);

        return ['user' => $user, 'tempPassword' => $tempPassword];
    }

    /**
     * @return array<string,mixed>
     */
    private function mapBranding(array $dto): array
    {
        $map = ['name' => 'name', 'memberLabel' => 'member_label', 'logoUrl' => 'logo_url', 'primaryColor' => 'primary_color'];
        $data = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $dto)) {
                $data[$col] = $dto[$in];
            }
        }

        return $data;
    }
}
