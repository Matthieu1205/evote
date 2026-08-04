<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CandidaciesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ElectionsController;
use App\Http\Controllers\OrganizationsController;
use App\Http\Controllers\TallyController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\VotesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — préfixe /api (configuré dans bootstrap/app.php)
|--------------------------------------------------------------------------
| Tranche verticale : authentification + flux de vote.
| Les autres modules (users, elections, candidacies, tally, dashboard,
| audit, organizations, upload) seront ajoutés ensuite.
*/

Route::prefix('auth')->group(function () {
    // Routes publiques
    Route::post('request-otp', [AuthController::class, 'requestOtp'])
        ->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);

    // Routes authentifiées
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
    });
});

// --- Organisations : routes publiques ---
Route::get('organizations/lookup', [OrganizationsController::class, 'lookup']);
Route::post('organizations/register', [OrganizationsController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    // --- Votes ---
    Route::get('votes/check/{electionId}', [VotesController::class, 'hasVoted']);
    Route::post('votes/request-otp/{electionId}', [VotesController::class, 'requestOtp'])
        ->middleware('throttle:3,1');
    Route::post('votes', [VotesController::class, 'cast']);

    // --- Élections (lecture : tout membre authentifié) ---
    Route::get('elections', [ElectionsController::class, 'index']);
    Route::get('elections/{id}', [ElectionsController::class, 'show']);

    // --- Résultats ---
    // results : le service filtre selon statut + rôle (électeur = PUBLIE).
    Route::get('elections/{id}/results', [TallyController::class, 'results']);
    // Procès-verbal PDF (même contrôle d'accès que results).
    Route::get('elections/{id}/results/pv', [TallyController::class, 'pv']);
    // live-results : réservé aux rôles de surveillance (correctif audit C1).
    Route::get('elections/{id}/live-results', [TallyController::class, 'liveResults'])
        ->middleware('role:COMMISSION,ADMIN,OBSERVATEUR');

    // --- Élections (écriture : ADMIN / COMMISSION) ---
    Route::middleware('role:ADMIN,COMMISSION')->group(function () {
        Route::post('elections', [ElectionsController::class, 'store']);
        Route::put('elections/{id}', [ElectionsController::class, 'update']);
        Route::put('elections/{id}/status', [ElectionsController::class, 'changeStatus']);
        Route::post('elections/{id}/positions', [ElectionsController::class, 'addPosition']);
        Route::put('elections/{id}/positions/{posId}', [ElectionsController::class, 'updatePosition']);
        Route::delete('elections/{id}/positions/{posId}', [ElectionsController::class, 'removePosition']);
    });

    // Dépouillement officiel : COMMISSION / ADMIN.
    Route::post('elections/{id}/tally', [TallyController::class, 'runTally'])
        ->middleware('role:COMMISSION,ADMIN');

    // Création automatique du second tour : COMMISSION / ADMIN.
    Route::post('elections/{id}/runoff', [TallyController::class, 'runoff'])
        ->middleware('role:COMMISSION,ADMIN');

    // Rappel manuel aux non-votants : COMMISSION / ADMIN.
    Route::post('elections/{id}/remind', [ElectionsController::class, 'remind'])
        ->middleware('role:COMMISSION,ADMIN');

    // Suppression : ADMIN.
    Route::delete('elections/{id}', [ElectionsController::class, 'destroy'])
        ->middleware('role:ADMIN');

    // --- Candidatures ---
    Route::get('candidacies', [CandidaciesController::class, 'index']);

    // Conditions de candidature (déclarées AVANT candidacies/{id} pour éviter
    // que « conditions » soit interprété comme un {id}).
    Route::get('candidacies/conditions', [CandidaciesController::class, 'getConditions']);
    Route::post('candidacies/conditions', [CandidaciesController::class, 'createCondition'])
        ->middleware('role:ADMIN');
    Route::put('candidacies/conditions/{id}', [CandidaciesController::class, 'updateCondition'])
        ->middleware('role:ADMIN');
    Route::delete('candidacies/conditions/{id}', [CandidaciesController::class, 'deleteCondition'])
        ->middleware('role:ADMIN');

    Route::get('candidacies/{id}', [CandidaciesController::class, 'show']);
    Route::post('candidacies', [CandidaciesController::class, 'store'])
        ->middleware('role:ELECTEUR,CANDIDAT,COMMISSION,ADMIN');
    Route::put('candidacies/{id}/validate', [CandidaciesController::class, 'validateCandidacy'])
        ->middleware('role:COMMISSION,ADMIN');
    Route::put('candidacies/{id}/reject', [CandidaciesController::class, 'reject'])
        ->middleware('role:COMMISSION,ADMIN');
    Route::put('candidacies/{id}/withdraw', [CandidaciesController::class, 'withdraw']);
    // Modifier sa candidature en attente (propriétaire, statut SOUMISE).
    Route::put('candidacies/{id}', [CandidaciesController::class, 'update']);

    // --- Membres (users) ---
    Route::get('users', [UsersController::class, 'index'])
        ->middleware('role:ADMIN,COMMISSION,OBSERVATEUR');

    // import/export AVANT users/{id} pour éviter le conflit de route.
    Route::post('users/import', [UsersController::class, 'importCsv'])
        ->middleware('role:ADMIN');
    Route::get('users/export', [UsersController::class, 'exportCsv'])
        ->middleware('role:ADMIN');

    Route::get('users/{id}', [UsersController::class, 'show'])
        ->middleware('role:ADMIN,COMMISSION');
    Route::post('users', [UsersController::class, 'store'])
        ->middleware('role:ADMIN');
    Route::put('users/{id}', [UsersController::class, 'update'])
        ->middleware('role:ADMIN');
    Route::post('users/{id}/reset-password', [UsersController::class, 'resetPassword'])
        ->middleware('role:ADMIN');
    Route::delete('users/{id}', [UsersController::class, 'destroy'])
        ->middleware('role:ADMIN');

    // --- Tableau de bord ---
    Route::get('dashboard/live-scores', [DashboardController::class, 'liveScores']);
    Route::middleware('role:ADMIN,COMMISSION,OBSERVATEUR')->group(function () {
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('dashboard/charts', [DashboardController::class, 'charts']);
        Route::get('dashboard/recent-activity', [DashboardController::class, 'recentActivity']);

        // --- Journal d'audit ---
        Route::get('audit', [AuditLogController::class, 'index']);
    });

    // --- Upload (photos / vidéos) ---
    Route::post('upload', [UploadController::class, 'store']);

    // --- Organisations (authentifié) ---
    // « me » AVANT « {id} » pour ne pas être capté comme un identifiant.
    Route::put('organizations/me', [OrganizationsController::class, 'updateOwn'])
        ->middleware('role:ADMIN');
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('organizations', [OrganizationsController::class, 'index']);
        Route::get('organizations/{id}', [OrganizationsController::class, 'show']);
        Route::post('organizations', [OrganizationsController::class, 'store']);
        Route::put('organizations/{id}', [OrganizationsController::class, 'update']);
        Route::post('organizations/{id}/admins', [OrganizationsController::class, 'createAdmin']);
    });
});
