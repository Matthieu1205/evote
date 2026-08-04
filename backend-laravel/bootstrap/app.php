<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withSchedule(function (Schedule $schedule) {
        // Rappel automatique aux non-votants des scrutins clôturant sous 24 h.
        $schedule->command('evote:vote-reminders')->hourly();
    })
    ->withMiddleware(function (Middleware $middleware) {
        // Authentification par token Bearer (Sanctum) uniquement — pas de
        // cookie de session ambiant, donc pas de surface CSRF (le token en
        // en-tête Authorization ne peut pas être rejoué en cross-site).
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Toutes les erreurs des routes /api/* sont rendues en JSON { message }
        // (jamais en HTML) — le frontend React lit err.message.
        $exceptions->shouldRenderJsonWhen(function (Request $request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Backend API-only : une requête non authentifiée renvoie toujours un
        // 401 JSON (jamais de redirection vers une route « login » inexistante).
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(
                ['message' => 'Session expirée ou non authentifié.'],
                401,
            );
        });
    })->create();
