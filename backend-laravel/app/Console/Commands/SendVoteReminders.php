<?php

namespace App\Console\Commands;

use App\Models\Election;
use App\Services\ElectionService;
use Illuminate\Console\Command;

/**
 * Rappel automatique : envoie un email aux non-votants des scrutins ouverts
 * qui clôturent dans les prochaines heures (par défaut 24 h). Idempotent grâce
 * à `reminder_sent_at` : un scrutin n'est rappelé qu'une seule fois.
 *
 *   php artisan evote:vote-reminders [--hours=24]
 */
class SendVoteReminders extends Command
{
    protected $signature = 'evote:vote-reminders {--hours=24 : Fenêtre avant clôture, en heures}';

    protected $description = 'Envoie un rappel aux non-votants des scrutins clôturant bientôt.';

    public function handle(ElectionService $elections): int
    {
        $within = now()->addHours((int) $this->option('hours'));

        $due = Election::where('status', 'OUVERT')
            ->whereNull('reminder_sent_at')
            ->whereNotNull('end_at')
            ->where('end_at', '>=', now())
            ->where('end_at', '<=', $within)
            ->get();

        $total = 0;
        foreach ($due as $election) {
            $sent = $elections->dispatchReminders($election);
            $election->update(['reminder_sent_at' => now()]);
            $total += $sent;
            $this->info("« {$election->title} » : {$sent} rappel(s).");
        }

        $this->info("Terminé — {$due->count()} scrutin(s), {$total} rappel(s) au total.");

        return self::SUCCESS;
    }
}
