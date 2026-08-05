#!/usr/bin/env sh
set -e

# Cache de configuration et de routes (performances en production).
php artisan config:cache
php artisan route:cache

# Migrations (non interactif).
php artisan migrate --force

# Serveur HTTP sur le port fourni par Render.
php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
