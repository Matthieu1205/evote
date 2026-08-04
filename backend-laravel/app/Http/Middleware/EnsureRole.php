<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contrôle d'accès par rôle (équivalent du RolesGuard NestJS).
 * Usage : ->middleware('role:ADMIN,COMMISSION')
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Session expirée ou non authentifié.');
        }

        if (! in_array($user->role, $roles, true)) {
            abort(403, 'Vous ne disposez pas des droits nécessaires pour cette action.');
        }

        // Défense en profondeur : un SUPER_ADMIN n'est légitime que sur
        // l'organisation plateforme.
        if ($user->role === 'SUPER_ADMIN' && ! $user->organization?->is_platform) {
            abort(403, 'Vous ne disposez pas des droits nécessaires pour cette action.');
        }

        return $next($request);
    }
}
