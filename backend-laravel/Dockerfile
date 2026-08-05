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

# Dépendances PHP (install reproductible ; fallback update si le lock est en retard)
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    || composer update --no-dev --optimize-autoloader --no-interaction

# Répertoires inscriptibles
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs bootstrap/cache public/uploads \
    && chmod -R 775 storage bootstrap/cache public/uploads

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "docker/start.sh"]
