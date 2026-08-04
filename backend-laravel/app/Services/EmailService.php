<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Envoi des emails transactionnels (OTP, bienvenue, notifications).
 * Best-effort : un échec SMTP est journalisé mais ne fait jamais échouer
 * l'action métier appelante.
 */
class EmailService
{
    private function send(string $to, string $subject, string $view, array $data): void
    {
        try {
            Mail::send($view, $data, function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error("[EMAIL] Échec envoi à {$to} ({$subject}) : ".$e->getMessage());
        }
    }

    public function sendOtp(string $to, string $name, string $code, string $purpose): void
    {
        $label = match ($purpose) {
            'LOGIN' => 'connexion à votre espace',
            'RESET' => 'réinitialisation de mot de passe',
            default => 'confirmation de vote',
        };

        $this->send($to, "Votre code de {$label} — {$code}", 'emails.otp', [
            'name' => $name,
            'code' => $code,
            'label' => $label,
        ]);
    }

    public function sendWelcome(string $to, string $name, string $ordreNumber, string $tempPassword = ''): void
    {
        $this->send($to, 'Bienvenue sur eVote — vos identifiants de connexion', 'emails.welcome', [
            'name' => $name,
            'ordreNumber' => $ordreNumber,
            'tempPassword' => $tempPassword,
            'appUrl' => config('evote.frontend_url'),
        ]);
    }

    public function sendCandidacyStatus(string $to, string $name, string $positionTitle, string $status, ?string $reviewNote = null): void
    {
        $isValid = $status === 'VALIDEE';
        $subject = $isValid
            ? 'Votre candidature a été validée — eVote'
            : "Votre candidature n'a pas été retenue — eVote";

        $this->send($to, $subject, 'emails.candidacy-status', [
            'name' => $name,
            'positionTitle' => $positionTitle,
            'isValid' => $isValid,
            'reviewNote' => $reviewNote,
        ]);
    }

    public function sendElectionOpen(string $to, string $name, string $electionTitle, string $loginUrl): void
    {
        $this->send($to, "Le scrutin « {$electionTitle} » est ouvert — eVote", 'emails.election-open', [
            'name' => $name,
            'electionTitle' => $electionTitle,
            'loginUrl' => $loginUrl,
        ]);
    }

    public function sendResultsPublished(string $to, string $name, string $electionTitle, string $resultsUrl): void
    {
        $this->send($to, "Résultats publiés : « {$electionTitle} » — eVote", 'emails.results-published', [
            'name' => $name,
            'electionTitle' => $electionTitle,
            'resultsUrl' => $resultsUrl,
        ]);
    }

    public function sendVoteReminder(string $to, string $name, string $electionTitle, ?string $deadline, string $loginUrl): void
    {
        $this->send($to, "Rappel : votez pour « {$electionTitle} » — eVote", 'emails.vote-reminder', [
            'name' => $name,
            'electionTitle' => $electionTitle,
            'deadline' => $deadline,
            'loginUrl' => $loginUrl,
        ]);
    }
}
