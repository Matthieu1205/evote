<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Pas d'enveloppe « data » automatique sur les resources : le frontend
        // React attend l'objet JSON directement (parité avec l'API NestJS).
        // Les endpoints paginés construisent { data, meta } explicitement.
        JsonResource::withoutWrapping();
    }
}
