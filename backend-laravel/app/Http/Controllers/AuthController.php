<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RequestOtpRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Services\AuditService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private OtpService $otp,
        private AuditService $audit,
    ) {}

    private function resolveOrganizationId(string $slug): ?string
    {
        return Organization::where('slug', $slug)->value('id');
    }

    private function findUser(string $slug, string $email): ?User
    {
        $organizationId = $this->resolveOrganizationId($slug);
        if (! $organizationId) {
            return null;
        }

        return User::where('organization_id', $organizationId)
            ->where('email', $email)
            ->first();
    }

    /**
     * Étape 1 : vérifier les identifiants et envoyer un OTP.
     */
    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        $generic = ['message' => 'Si ce compte existe, un OTP a été envoyé.'];

        $user = $this->findUser($request->organizationSlug, $request->email);
        if (! $user) {
            return response()->json($generic);
        }

        if (! Hash::check($request->password, $user->password_hash)) {
            $this->audit->log([
                'actorId' => $user->id,
                'action' => 'LOGIN_FAILED',
                'entity' => 'User',
                'entityId' => $user->id,
                'ip' => $request->ip(),
                'organizationId' => $user->organization_id,
            ]);

            return response()->json($generic);
        }

        if ($user->status !== 'ACTIF') {
            // Message générique pour éviter l'énumération par statut (audit M3).
            return response()->json($generic);
        }

        if (config('evote.otp.bypass')) {
            return response()->json(['message' => 'Mode bypass — aucun OTP requis.']);
        }

        $code = $this->otp->issueOtp($user->id, 'LOGIN');

        return response()->json([
            'message' => 'Code OTP envoyé par email.',
            ...(config('evote.otp.expose_code') ? ['devCode' => $code] : []),
        ]);
    }

    /**
     * Étape 2 : valider l'OTP, créer la session et renvoyer un token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->findUser($request->organizationSlug, $request->email);
        if (! $user) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if (! Hash::check($request->password, $user->password_hash)) {
            $this->audit->log([
                'actorId' => $user->id,
                'action' => 'LOGIN_FAILED',
                'entity' => 'User',
                'entityId' => $user->id,
                'ip' => $request->ip(),
                'organizationId' => $user->organization_id,
            ]);

            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if ($user->status !== 'ACTIF') {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        if (! config('evote.otp.bypass')) {
            $ok = $this->otp->verifyOtp($user->id, 'LOGIN', $request->otp ?? '');
            if (! $ok) {
                $this->audit->log([
                    'actorId' => $user->id,
                    'action' => 'LOGIN_OTP_FAILED',
                    'entity' => 'User',
                    'entityId' => $user->id,
                    'ip' => $request->ip(),
                    'organizationId' => $user->organization_id,
                ]);

                return response()->json(['message' => 'Code OTP invalide ou expiré.'], 401);
            }
        }

        $user->loadMissing('organization');

        // Token Bearer révocable (Sanctum) — expire selon config/sanctum.php.
        $token = $user->createToken('web')->plainTextToken;

        $this->audit->log([
            'actorId' => $user->id,
            'action' => 'LOGIN_SUCCESS',
            'entity' => 'User',
            'entityId' => $user->id,
            'ip' => $request->ip(),
            'organizationId' => $user->organization_id,
        ]);

        return response()->json([
            'id' => $user->id,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'email' => $user->email,
            'role' => $user->role,
            'ordreNumber' => $user->ordre_number,
            'status' => $user->status,
            'mustChangePassword' => $user->must_change_password,
            'token' => $token,
            'organization' => new OrganizationResource($user->organization),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Révoque le token Bearer courant (corrige l'audit M1).
        $token = $user?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        // Détruit la session cookie si présente.
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($user) {
            $this->audit->log(['actorId' => $user->id, 'action' => 'LOGOUT']);
        }

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->currentPassword, $user->password_hash)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 401);
        }

        if ($request->currentPassword === $request->newPassword) {
            return response()->json(
                ['message' => "Le nouveau mot de passe doit être différent de l'actuel."],
                403,
            );
        }

        $user->update(['password_hash' => Hash::make($request->newPassword), 'must_change_password' => false]);

        $this->audit->log([
            'actorId' => $user->id,
            'action' => 'PASSWORD_CHANGED',
            'entity' => 'User',
            'entityId' => $user->id,
        ]);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $generic = [
            'message' => 'Si ce compte existe, un code de réinitialisation a été envoyé.',
        ];

        $user = $this->findUser($request->organizationSlug, $request->email);
        if ($user && $user->status === 'ACTIF') {
            $this->otp->issueOtp($user->id, 'RESET');
        }

        return response()->json($generic);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        // Message générique en cas de compte inexistant/invalide (audit M3).
        $invalid = response()->json(['message' => 'Code invalide ou expiré.'], 401);

        $user = $this->findUser($request->organizationSlug, $request->email);
        if (! $user) {
            return $invalid;
        }

        if (! $this->otp->verifyOtp($user->id, 'RESET', $request->otp)) {
            return $invalid;
        }

        $user->update(['password_hash' => Hash::make($request->newPassword), 'must_change_password' => false]);

        $this->audit->log([
            'actorId' => $user->id,
            'action' => 'PASSWORD_CHANGED',
            'entity' => 'User',
            'entityId' => $user->id,
        ]);

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->loadMissing('organization'));
    }

    public function updateProfile(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();

        $map = [
            'firstName' => 'first_name',
            'lastName' => 'last_name',
            'phone' => 'phone',
            'section' => 'section',
            'region' => 'region',
            'photoUrl' => 'photo_url',
        ];

        $data = [];
        foreach ($map as $in => $col) {
            if ($request->has($in)) {
                $data[$col] = $request->input($in);
            }
        }

        $user->update($data);

        return new UserResource($user->fresh()->loadMissing('organization'));
    }
}
