# Backend eVote (Laravel 12) — image de production pour Render
FROM php:8.3-cli

# Dépendances système + extensions PHP (PostgreSQL, gd/dompdf, intl, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip \
        libpq-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
        libonig-dev libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql zip gd bcmath intl mbstring opcache \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Code de l'application
COPY . .

# Dépendances PHP — avec réessais : GitHub renvoie parfois des 429 (rate limit)
# sur les téléchargements de paquets. On retente plusieurs fois avant d'abandonner.
RUN for i in 1 2 3 4 5 6; do \
        composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist && break; \
        echo ">> Composer a échoué (tentative $i) — nouvelle tentative dans 20s…"; \
        sleep 20; \
    done \
    && test -f vendor/autoload.php

# Répertoires inscriptibles
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs bootstrap/cache public/uploads \
    && chmod -R 775 storage bootstrap/cache public/uploads

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "docker/start.sh"]
