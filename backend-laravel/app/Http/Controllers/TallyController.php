<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Services\TallyService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TallyController extends Controller
{
    public function __construct(private TallyService $tally) {}

    public function runTally(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $publish = (bool) $request->input('publish', false);

        return response()->json(
            $this->tally->runTally($user->organization_id, $id, $publish, $user->id)
        );
    }

    /**
     * Crée automatiquement le second tour pour les postes sans vainqueur
     * (majorité absolue non atteinte).
     */
    public function runoff(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->tally->createRunoff($user->organization_id, $id, $user->id)
        );
    }

    /**
     * Résultats officiels — accessibles à tout membre, mais le service filtre
     * selon le statut ET le rôle (électeur : PUBLIE seulement).
     */
    public function results(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->tally->getResults($user->organization_id, $id, $user->role)
        );
    }

    /**
     * Résultats en temps réel — réservés aux rôles de surveillance
     * (correctif audit C1 : jamais exposés à un électeur pendant le vote).
     */
    public function liveResults(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        return response()->json(
            $this->tally->computeTally($user->organization_id, $id)
        );
    }

    /**
     * Procès-verbal officiel du scrutin en PDF. Même contrôle d'accès que les
     * résultats (électeur : seulement une fois PUBLIÉ).
     */
    public function pv(Request $request, string $id): Response
    {
        $user = $request->user();

        // getResults applique le gate statut + rôle et renvoie le dépouillement.
        $result = $this->tally->getResults($user->organization_id, $id, $user->role);

        $election = Election::with('organization')
            ->where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $pdf = Pdf::loadView('pv', [
            'election' => $election,
            'result' => $result,
            'generatedBy' => "{$user->first_name} {$user->last_name}",
        ])->setPaper('a4');

        return $pdf->download('proces-verbal-'.$election->id.'.pdf');
    }
}
