<?php

namespace App\Services;

use App\Models\Otp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OtpService
{
    public function __construct(
        private CryptoService $crypto,
        private EmailService $email,
    ) {}

    /**
     * Émet un OTP pour un but donné et le délivre (log ou email).
     */
    public function issueOtp(string $userId, string $purpose, ?string $context = null): string
    {
        // Invalide les OTP précédents non consommés pour ce but.
        Otp::where('user_id', $userId)
            ->where('purpose', $purpose)
            ->where('consumed', false)
            ->update(['consumed' => true]);

        $code = $this->crypto->randomNumericCode(6);

        Otp::create([
            'user_id' => $userId,
            'purpose' => $purpose,
            'context' => $context,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addSeconds((int) config('evote.otp.ttl')),
            'consumed' => false,
            'attempts' => 0,
            'created_at' => now(),
        ]);

        $this->deliver($userId, $purpose, $code);

        return $code;
    }

    /**
     * Vérifie un OTP. Consomme le code en cas de succès, incrémente le
     * compteur de tentatives sinon.
     */
    public function verifyOtp(string $userId, string $purpose, string $code, ?string $context = null): bool
    {
        $query = Otp::where('user_id', $userId)
            ->where('purpose', $purpose)
            ->where('consumed', false);

        if ($context !== null) {
            $query->where('context', $context);
        }

        $otp = $query->orderByDesc('created_at')->first();

        if (! $otp) {
            return false;
        }
        if ($otp->expires_at->isPast()) {
            return false;
        }
        if ($otp->attempts >= (int) config('evote.otp.max_attempts')) {
            return false;
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            return false;
        }

        $otp->update(['consumed' => true]);

        return true;
    }

    private function deliver(string $userId, string $purpose, string $code): void
    {
        $delivery = config('evote.otp.delivery', 'log');

        if ($delivery === 'email') {
            $user = User::find($userId);
            if (! $user) {
                Log::error("[OTP] Utilisateur introuvable : {$userId}");

                return;
            }
            $recipient = config('evote.otp.override_email') ?: $user->email;
            $name = "{$user->first_name} {$user->last_name}";

            if (! app()->environment('production')) {
                Log::info("[OTP DEV] {$purpose} → {$recipient} : {$code}");
            }

            $this->email->sendOtp($recipient, $name, $code, $purpose);
        } else {
            Log::info("[OTP] {$purpose} pour {$userId} : {$code}");
        }
    }
}
