# Déploiement du backend eVote sur Render (PostgreSQL + Docker + Resend)

Le backend Laravel tourne sur **Render** (via Docker), avec une base **PostgreSQL managée** (Render) et l'envoi d'emails via **Resend** (API HTTPS, non bloquée par les hébergeurs). Le frontend reste sur **Vercel**.

---

## 0. Avant de commencer

1. **Un compte Resend** (https://resend.com) → crée une **API key**. Pour tester tout de suite, tu peux envoyer depuis `onboarding@resend.dev` ; pour la vraie prod, vérifie ton domaine dans Resend et utilise une adresse `no-reply@ton-domaine.com`.
2. **Synchroniser le composer.lock** (on a ajouté Resend). En local :
   ```bash
   cd backend-laravel
   composer require resend/resend-php
   git add -A
   git commit -m "Ajout Resend + config déploiement Render"
   git push
   ```

---

## 1. Créer la base PostgreSQL sur Render

1. Render → **New +** → **PostgreSQL**.
2. Nom : `evote-db`, plan **Free**, région proche.
3. Une fois créée, copie l'**Internal Database URL** (commence par `postgres://…`). Elle servira de `DB_URL`.

---

## 2. Créer le Web Service (Docker)

1. Render → **New +** → **Web Service** → connecte ton dépôt GitHub `evote`.
2. Réglages :
   - **Root Directory** : `backend-laravel`
   - **Runtime / Environment** : **Docker** (Render détecte le `Dockerfile`)
   - **Plan** : Free (ou Starter pour éviter la mise en veille)
3. **Environment Variables** : ajoute toutes les variables ci-dessous (voir `.env.production.example`).

### Variables à définir

| Variable | Valeur |
|----------|--------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | généré (voir §3) |
| `APP_URL` | l'URL Render du backend (ex. `https://evote-backend.onrender.com`) |
| `FRONTEND_URL` | l'URL Vercel du frontend (origine exacte, sans slash) |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | l'Internal Database URL de l'étape 1 |
| `HASH_DRIVER` | `bcrypt` |
| `SESSION_DRIVER` | `database` |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_SAME_SITE` | `none` |
| `CACHE_STORE` | `database` |
| `BALLOT_ENCRYPTION_KEY` | 64 hex (voir §3) |
| `OTP_DELIVERY` | `email` |
| `OTP_EXPOSE_CODE` | `false` |
| `MAIL_MAILER` | `resend` |
| `RESEND_API_KEY` | ta clé Resend |
| `MAIL_FROM_ADDRESS` | adresse d'expéditeur vérifiée |
| `MAIL_FROM_NAME` | `eVote` |

---

## 3. Générer les clés

En local (dans `backend-laravel`) :

```bash
php artisan key:generate --show      # → colle la valeur (base64:...) dans APP_KEY
php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"   # → BALLOT_ENCRYPTION_KEY
```

> ⚠️ Utilise des clés **différentes** de celles de ton `.env` local.

---

## 4. Déployer

Clique **Create Web Service**. Render construit l'image Docker puis lance `docker/start.sh`, qui :
1. met en cache la config et les routes,
2. exécute les **migrations** (`php artisan migrate --force`),
3. démarre le serveur.

Le premier build prend quelques minutes. Une fois « Live », note l'URL du service.

---

## 5. Brancher le frontend (Vercel)

Dans Vercel → ton projet frontend → **Settings → Environment Variables** :

```
VITE_API_URL = https://evote-backend.onrender.com/api
```

Puis **redéploie** le frontend (Vercel → Deployments → Redeploy). Le frontend appellera désormais le backend Render.

Vérifie aussi que `FRONTEND_URL` (côté Render) correspond **exactement** à l'URL Vercel, sinon le CORS bloquera les requêtes.

---

## 6. Premier compte / organisation

Deux options :
- **Inscription publique** : va sur `/register` du frontend pour créer une organisation + son premier admin.
- **Seed de démo** : dans Render → onglet **Shell** du service :
  ```bash
  php artisan db:seed --force
  ```
  (crée l'organisation `demo` et les comptes de test).

---

## 7. Vérifier l'email

Connecte-toi : l'OTP doit arriver par email (via Resend). Sinon, regarde les **logs Render** — une erreur Resend (clé invalide, expéditeur non vérifié) y apparaîtra.

---

## Limite connue : uploads éphémères

Le disque de Render est **éphémère** : les photos uploadées (dans `public/uploads`) sont **perdues à chaque redéploiement**. Pour la prod, il faut brancher un stockage objet (**Cloudinary** ou S3). Le `UploadController` peut être étendu pour cela — à faire dans un second temps.

---

## Rappels de vote automatiques (cron)

Render propose des **Cron Jobs**. Crée un Cron Job (même image Docker) qui exécute :

```
php artisan evote:vote-reminders
```

toutes les heures, pour relancer automatiquement les non-votants avant la clôture.
