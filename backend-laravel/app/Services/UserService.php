<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(
        private AuditService $audit,
        private CryptoService $crypto,
        private EmailService $email,
    ) {}

    /**
     * @return array{data:\Illuminate\Support\Collection,meta:array}
     */
    public function findAll(string $organizationId, array $params): array
    {
        $page = (int) ($params['page'] ?? 1);
        $limit = (int) ($params['limit'] ?? 20);

        $query = User::where('organization_id', $organizationId);

        if (! empty($params['role'])) {
            $query->where('role', $params['role']);
        }
        if (! empty($params['status'])) {
            $query->where('status', $params['status']);
        }
        if (! empty($params['search'])) {
            $s = $params['search'];
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                    ->orWhere('last_name', 'like', "%{$s}%")
                    ->orWhere('ordre_number', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%");
            });
        }

        $total = (clone $query)->count();

        $users = $query->orderBy('last_name')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        return [
            'data' => $users,
            'meta' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => (int) ceil($total / max($limit, 1)),
            ],
        ];
    }

    public function findOne(string $organizationId, string $id): User
    {
        $user = User::where('id', $id)->where('organization_id', $organizationId)->first();
        abort_if(! $user, 404, "Utilisateur {$id} introuvable.");

        return $user;
    }

    public function create(string $organizationId, array $dto, ?string $actorId): User
    {
        abort_if(
            ($dto['role'] ?? null) === 'SUPER_ADMIN',
            403,
            'Le rôle Super Administrateur ne peut pas être attribué depuis la gestion des membres.',
        );

        $emailExists = User::where('organization_id', $organizationId)->where('email', $dto['email'])->exists();
        abort_if($emailExists, 409, 'Email déjà utilisé.');

        $ordreNumber = trim($dto['ordreNumber'] ?? '');
        if ($ordreNumber !== '') {
            $exists = User::where('organization_id', $organizationId)->where('ordre_number', $ordreNumber)->exists();
            abort_if($exists, 409, "Numéro d'ordre déjà utilisé.");
        } else {
            $ordreNumber = $this->generateOrdreNumber($organizationId);
        }

        $tempPassword = $this->crypto->randomPassword(12);

        $user = User::create([
            'organization_id' => $organizationId,
            'ordre_number' => $ordreNumber,
            'email' => $dto['email'],
            'first_name' => $dto['firstName'],
            'last_name' => $dto['lastName'],
            'password_hash' => Hash::make($tempPassword),
            'role' => $dto['role'] ?? 'ELECTEUR',
            'status' => $dto['status'] ?? 'ACTIF',
            'is_eligible' => $dto['isEligible'] ?? true,
            'section' => $dto['section'] ?? null,
            'region' => $dto['region'] ?? null,
            'phone' => $dto['phone'] ?? null,
            'membership_date' => $dto['membershipDate'] ?? null,
            'dues_up_to_date' => $dto['duesUpToDate'] ?? false,
            'must_change_password' => true,
        ]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'USER_CREATED',
            'entity' => 'User',
            'entityId' => $user->id,
            'organizationId' => $organizationId,
        ]);

        $this->sendWelcome($user, $tempPassword);

        return $user;
    }

    private function generateOrdreNumber(string $organizationId): string
    {
        $slug = Organization::where('id', $organizationId)->value('slug') ?? 'MBR';
        $prefix = strtoupper($slug);

        $seq = User::where('organization_id', $organizationId)->count() + 1;
        $candidate = $prefix.'-'.str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
        while (User::where('organization_id', $organizationId)->where('ordre_number', $candidate)->exists()) {
            $seq++;
            $candidate = $prefix.'-'.str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    public function update(string $organizationId, string $id, array $dto, ?string $actorId): User
    {
        abort_if(
            ($dto['role'] ?? null) === 'SUPER_ADMIN',
            403,
            'Le rôle Super Administrateur ne peut pas être attribué depuis la gestion des membres.',
        );

        $user = $this->findOne($organizationId, $id);

        $map = [
            'ordreNumber' => 'ordre_number', 'email' => 'email', 'firstName' => 'first_name',
            'lastName' => 'last_name', 'role' => 'role', 'status' => 'status',
            'isEligible' => 'is_eligible', 'section' => 'section', 'region' => 'region', 'phone' => 'phone',
            'membershipDate' => 'membership_date', 'duesUpToDate' => 'dues_up_to_date',
        ];
        $data = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $dto)) {
                $data[$col] = $dto[$in];
            }
        }
        if (! empty($dto['password'])) {
            $data['password_hash'] = Hash::make($dto['password']);
        }

        $user->update($data);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'USER_UPDATED',
            'entity' => 'User',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        return $user->fresh();
    }

    public function resetPassword(string $organizationId, string $id, ?string $actorId): array
    {
        $user = $this->findOne($organizationId, $id);

        $tempPassword = $this->crypto->randomPassword(12);
        $user->update(['password_hash' => Hash::make($tempPassword), 'must_change_password' => true]);

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'PASSWORD_RESET',
            'entity' => 'User',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        $this->sendWelcome($user, $tempPassword);

        return ['message' => "Mot de passe réinitialisé. Un email a été envoyé à {$user->email}."];
    }

    public function remove(string $organizationId, string $id, ?string $actorId): array
    {
        $user = $this->findOne($organizationId, $id);
        $user->delete();

        $this->audit->log([
            'actorId' => $actorId,
            'action' => 'USER_DELETED',
            'entity' => 'User',
            'entityId' => $id,
            'organizationId' => $organizationId,
        ]);

        return ['message' => 'Utilisateur supprimé.'];
    }

    private function sendWelcome(User $user, string $tempPassword): void
    {
        if (! app()->environment('production')) {
            Log::info("[WELCOME] {$user->email} — mot de passe temporaire : {$tempPassword}");
        }
        $this->email->sendWelcome($user->email, "{$user->first_name} {$user->last_name}", $user->ordre_number, $tempPassword);
    }

    // ─── Import / Export CSV ───────────────────────────────────────────────

    private function normalizeHeader(string $s): string
    {
        $s = strtolower(Str::ascii($s));
        $s = preg_replace('/[^a-z0-9]/', '', $s) ?? '';

        return preg_replace('/s$/', '', $s) ?? '';
    }

    /**
     * @return string[]
     */
    private function parseRow(string $line, string $delimiter): array
    {
        $cols = [];
        $cur = '';
        $inQ = false;
        $len = strlen($line);
        for ($i = 0; $i < $len; $i++) {
            $ch = $line[$i];
            if ($ch === '"') {
                $inQ = ! $inQ;

                continue;
            }
            if ($ch === $delimiter && ! $inQ) {
                $cols[] = trim($cur);
                $cur = '';

                continue;
            }
            $cur .= $ch;
        }
        $cols[] = trim($cur);

        return $cols;
    }

    /**
     * @return array{created:int,skipped:int,errors:array<int,array{row:int,reason:string}>}
     */
    public function importCsv(string $organizationId, string $csvText, ?string $actorId): array
    {
        $csvText = preg_replace('/^\xEF\xBB\xBF/', '', $csvText);
        $csvText = str_replace("\r", '', trim($csvText));
        $lines = explode("\n", $csvText);

        if (count($lines) < 2) {
            return ['created' => 0, 'skipped' => 0, 'errors' => []];
        }

        $commaCount = substr_count($lines[0], ',');
        $semicolonCount = substr_count($lines[0], ';');
        $delimiter = $semicolonCount > $commaCount ? ';' : ',';

        $headers = array_map(fn ($h) => $this->normalizeHeader($h), $this->parseRow($lines[0], $delimiter));

        $col = function (array $row, string ...$keys) use ($headers) {
            foreach ($keys as $k) {
                $i = array_search($this->normalizeHeader($k), $headers, true);
                if ($i !== false) {
                    return trim($row[$i] ?? '');
                }
            }

            return '';
        };

        $created = 0;
        $skipped = 0;
        $errors = [];

        for ($i = 1; $i < count($lines); $i++) {
            if (trim($lines[$i]) === '') {
                continue;
            }
            $row = $this->parseRow($lines[$i], $delimiter);

            $ordreNumber = $col($row, 'ordrenumber', 'numero', 'numeromembre', 'numero de membre', 'membre', 'id_membre', 'id', 'matricule');
            $firstName = $col($row, 'prenom', 'firstname', 'first_name');
            $lastName = $col($row, 'nom', 'lastname', 'last_name');
            $email = $col($row, 'email', 'mail', 'courriel');
            $section = $col($row, 'section');
            $region = $col($row, 'region');
            $phone = $col($row, 'telephone', 'phone', 'tel');
            $eligibleRaw = $col($row, 'eligible', 'iseligible');
            $isEligible = $eligibleRaw === '' || in_array(strtolower($eligibleRaw), ['oui', 'true', '1', 'yes'], true);

            if ($ordreNumber === '' || $firstName === '' || $lastName === '' || $email === '') {
                $errors[] = ['row' => $i + 1, 'reason' => 'Champs obligatoires manquants (numéro, prénom, nom, email).'];

                continue;
            }

            $existing = User::where('organization_id', $organizationId)
                ->where(fn ($q) => $q->where('email', $email)->orWhere('ordre_number', $ordreNumber))
                ->exists();
            if ($existing) {
                $skipped++;

                continue;
            }

            try {
                $tempPassword = $this->crypto->randomPassword(12);
                $user = User::create([
                    'organization_id' => $organizationId,
                    'ordre_number' => $ordreNumber,
                    'email' => $email,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'password_hash' => Hash::make($tempPassword),
                    'role' => 'ELECTEUR',
                    'status' => 'ACTIF',
                    'is_eligible' => $isEligible,
                    'section' => $section ?: null,
                    'region' => $region ?: null,
                    'phone' => $phone ?: null,
                    'must_change_password' => true,
                ]);
                $this->audit->log(['actorId' => $actorId, 'action' => 'USER_CREATED', 'entity' => 'User', 'entityId' => $user->id, 'organizationId' => $organizationId]);
                $this->sendWelcome($user, $tempPassword);
                $created++;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $i + 1, 'reason' => 'Erreur lors de la création.'];
            }
        }

        return ['created' => $created, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Neutralise l'injection de formule CSV (=, +, -, @, tab).
     */
    private function sanitizeCsvField(string $value): string
    {
        return preg_match('/^[=+\-@\t]/', $value) ? "'".$value : $value;
    }

    public function exportCsv(string $organizationId): string
    {
        $users = User::where('organization_id', $organizationId)->orderBy('last_name')->get();

        $headers = ['Numéro Ordre', 'Prénom', 'Nom', 'Email', 'Rôle', 'Statut', 'Éligible', 'Section', 'Région', 'Téléphone', 'Date adhésion', 'Cotisations à jour', 'Créé le'];

        $rows = [];
        foreach ($users as $u) {
            $values = [
                $u->ordre_number, $u->first_name, $u->last_name, $u->email, $u->role, $u->status,
                $u->is_eligible ? 'Oui' : 'Non', $u->section ?? '', $u->region ?? '', $u->phone ?? '',
                optional($u->membership_date)->toDateString() ?? '', $u->dues_up_to_date ? 'Oui' : 'Non',
                optional($u->created_at)->toISOString() ?? '',
            ];
            $rows[] = implode(',', array_map(
                fn ($v) => '"'.str_replace('"', '""', $this->sanitizeCsvField((string) $v)).'"',
                $values,
            ));
        }

        return implode("\n", array_merge([implode(',', $headers)], $rows));
    }
}
