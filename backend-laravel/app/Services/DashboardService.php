<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\User;
use App\Models\VoteRecord;
use Illuminate\Support\Carbon;

class DashboardService
{
    /**
     * @return array<string,mixed>
     */
    public function getStats(string $organizationId): array
    {
        $users = User::where('organization_id', $organizationId);
        $elections = Election::where('organization_id', $organizationId);
        $candidacies = Candidacy::where('organization_id', $organizationId);

        return [
            'members' => [
                'total' => (clone $users)->count(),
                'active' => (clone $users)->where('status', 'ACTIF')->count(),
                'eligible' => (clone $users)->where('is_eligible', true)->where('status', 'ACTIF')->count(),
            ],
            'elections' => [
                'total' => (clone $elections)->count(),
                'open' => (clone $elections)->where('status', 'OUVERT')->count(),
            ],
            'candidacies' => [
                'total' => (clone $candidacies)->count(),
                'pending' => (clone $candidacies)->where('status', 'SOUMISE')->count(),
            ],
            'votes' => [
                'total' => VoteRecord::where('organization_id', $organizationId)->count(),
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function getCharts(string $organizationId): array
    {
        $groupCount = fn ($model, string $column) => $model::where('organization_id', $organizationId)
            ->selectRaw("$column as k, count(*) as c")
            ->groupBy($column)
            ->get()
            ->map(fn ($r) => [$column => $r->k, 'count' => (int) $r->c])
            ->all();

        // Votes des 24 dernières heures, groupés par heure (UTC).
        $h24 = Carbon::now()->subDay();
        $byHour = [];
        foreach (VoteRecord::where('organization_id', $organizationId)->where('voted_at', '>=', $h24)->pluck('voted_at') as $t) {
            $key = $t->format('Y-m-d\TH');
            $byHour[$key] = ($byHour[$key] ?? 0) + 1;
        }
        ksort($byHour);
        $votesByHour = array_map(fn ($k, $c) => ['hour' => $k, 'count' => $c], array_keys($byHour), array_values($byHour));

        // Votes des 7 derniers jours, groupés par jour.
        $d7 = Carbon::now()->subDays(7);
        $byDay = [];
        foreach (VoteRecord::where('organization_id', $organizationId)->where('voted_at', '>=', $d7)->orderBy('voted_at')->pluck('voted_at') as $t) {
            $key = $t->format('Y-m-d');
            $byDay[$key] = ($byDay[$key] ?? 0) + 1;
        }
        $votesByDay = array_map(fn ($k, $c) => ['date' => $k, 'count' => $c], array_keys($byDay), array_values($byDay));

        return [
            'membersByRole' => $groupCount(User::class, 'role'),
            'membersByStatus' => $groupCount(User::class, 'status'),
            'electionsByStatus' => $groupCount(Election::class, 'status'),
            'candidaciesByStatus' => $groupCount(Candidacy::class, 'status'),
            'votesByHour' => $votesByHour,
            'votesByDay' => $votesByDay,
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function getLiveScores(string $organizationId): array
    {
        $elections = Election::where('organization_id', $organizationId)
            ->whereIn('status', ['OUVERT', 'DEPOUILLE', 'PUBLIE'])
            ->get(['id', 'title', 'status', 'current_round']);

        $eligibleCount = User::where('organization_id', $organizationId)
            ->where('is_eligible', true)
            ->where('status', 'ACTIF')
            ->count();

        $scores = [];
        foreach ($elections as $e) {
            $voteCount = VoteRecord::where('organization_id', $organizationId)
                ->where('election_id', $e->id)
                ->where('round', $e->current_round)
                ->count();

            $scores[] = [
                'electionId' => $e->id,
                'title' => $e->title,
                'status' => $e->status,
                'round' => $e->current_round,
                'voteCount' => $voteCount,
                'eligibleCount' => $eligibleCount,
                'turnout' => $eligibleCount > 0 ? ($voteCount / $eligibleCount) * 100 : 0,
            ];
        }

        return $scores;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function getRecentActivity(string $organizationId, int $limit = 10)
    {
        return AuditLog::where('organization_id', $organizationId)
            ->orderByDesc('created_at')
            ->take($limit)
            ->with(['actor:id,first_name,last_name,ordre_number,role'])
            ->get();
    }
}
