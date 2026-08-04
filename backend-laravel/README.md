# eVote — Backend Laravel (MySQL)

Réécriture du backend NestJS en **Laravel 11 + MySQL**, compatible avec le frontend React existant (mêmes routes `/api/*`, mêmes formats JSON).

> **État actuel : portage complet terminé.**
> Schéma MySQL, modèles et **tous les modules** sont en place et testés de
> bout en bout : auth, votes, elections, tally, candidacies, users (+ CSV),
> dashboard, audit, organizations, upload.

---

## Prérequis

- **PHP 8.2+** compilé avec l'extension **Argon2id** (`password_hash` argon2id). Vérifier : `php -i | grep -i argon`.
- **Composer 2**
- **MySQL 8+** (base `pharmavote` par défaut)

---

## Installation

Ce dossier est un **projet Laravel autonome** (squelette inclus : `artisan`, `public/index.php`, config standard). Installation directe :

```bash
cd backend-laravel
composer install
```

> **Note Composer & sécurité.** On utilise Laravel **12** (Laravel 11 est
> bloqué par la politique d'advisories de Composer). Si `composer install`
> refuse encore une dépendance pour cause d'advisory, mets simplement à jour :
> `composer update`. Ne désactive pas la vérification des advisories.

---

## Configuration

```bash
cp .env.example .env
php artisan key:generate

# Générer la clé de chiffrement des bulletins (64 hex = 32 octets)
php -r "echo bin2hex(random_bytes(32)).PHP_EOL;"
# → coller la valeur dans BALLOT_ENCRYPTION_KEY du .env
```

Éditer `.env` :

```
DB_CONNECTION=mysql
DB_DATABASE=pharmavote
DB_USERNAME=root
DB_PASSWORD=...
FRONTEND_URL=http://localhost:5173
BALLOT_ENCRYPTION_KEY=<les 64 caractères générés>
OTP_DELIVERY=log
OTP_EXPOSE_CODE=true   # DEV uniquement : renvoie l'OTP dans la réponse
```

---

## Base de données

```bash
php artisan migrate       # crée toutes les tables
php artisan db:seed        # données de démonstration (organisation "demo")
php artisan serve --port=3001
# API : http://localhost:3001/api
```

Le seeder crée :

| Rôle | Email | Slug | Mot de passe |
|------|-------|------|--------------|
| Admin | admin@evote.local | demo | Pharma2026! |
| Électeur | electeur@evote.local | demo | Pharma2026! |

+ un scrutin **OUVERT** « Élection du Président » avec 2 candidats validés.

---

## Tester la tranche verticale (curl)

```bash
BASE=http://localhost:3001/api
SLUG=demo
EMAIL=electeur@evote.local
PWD='Pharma2026!'

# 1) Demander l'OTP de connexion (devCode renvoyé car OTP_EXPOSE_CODE=true)
curl -s -X POST $BASE/auth/request-otp \
  -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$SLUG\",\"email\":\"$EMAIL\",\"password\":\"$PWD\"}"
# → {"message":"...","devCode":"123456"}

# 2) Se connecter avec l'OTP → récupère le token
curl -s -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$SLUG\",\"email\":\"$EMAIL\",\"password\":\"$PWD\",\"otp\":\"123456\"}"
# → {"id":"...","token":"1|xxxx", ...}

TOKEN='1|xxxx'   # remplacer par le token reçu
ELECTION='...'   # l'id du scrutin affiché par le seeder

# 3) Vérifier si déjà voté
curl -s $BASE/votes/check/$ELECTION -H "Authorization: Bearer $TOKEN"
# → {"hasVoted":false,"round":1}

# 4) Demander l'OTP de vote
curl -s -X POST $BASE/votes/request-otp/$ELECTION -H "Authorization: Bearer $TOKEN"
# → {"message":"...","devCode":"654321"}

# 5) Voter (remplacer CANDIDACY_ID et POSITION_ID)
curl -s -X POST $BASE/votes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"electionId\":\"$ELECTION\",\"otp\":\"654321\",\"choices\":{\"POSITION_ID\":[\"CANDIDACY_ID\"]}}"
# → {"message":"Vote enregistré avec succès."}

# 6) Re-voter → refus (anti-double-vote)
# → 409 {"message":"Vous avez déjà voté pour ce scrutin."}
```

> Les `POSITION_ID` / `CANDIDACY_ID` se récupèrent en base (`positions`, `candidacies`) ou via le module `elections` une fois porté.

---

## Compatibilité avec le frontend React

Aucune modification du frontend nécessaire pour ces routes :

| Frontend | Backend Laravel |
|----------|-----------------|
| `POST /auth/request-otp` `{organizationSlug,email,password}` | ✅ identique |
| `POST /auth/login` `{...,otp}` → `{id,token,organization,...}` | ✅ identique |
| `GET /auth/me` → objet camelCase + `organization` | ✅ identique |
| `POST /auth/logout` / `change-password` / `forgot-password` / `reset-password` | ✅ identique |
| `PUT /auth/profile` | ✅ identique |
| `GET /votes/check/:id` → `{hasVoted,round}` | ✅ identique |
| `POST /votes/request-otp/:id` → `{message,devCode?}` | ✅ identique |
| `POST /votes` `{electionId,otp,choices}` | ✅ identique |

Le frontend envoie le `token` en `Authorization: Bearer` (stocké en `sessionStorage`) **et** le cookie de session (`credentials: include`). Les deux fonctionnent : token via Sanctum, session via domaine stateful (`SANCTUM_STATEFUL_DOMAINS`).

---

## Améliorations de sécurité intégrées (issues de l'audit)

- **M1** — les tokens Bearer sont désormais **révocables** : `logout` supprime le token Sanctum courant (l'ancien token HMAC NestJS n'était pas révocable).
- **E1** — CORS restreint à `FRONTEND_URL` (plus de motif générique `*.vercel.app`).
- **M3** — messages d'erreur uniformisés (`reset-password` ne révèle plus l'existence d'un compte).
- **F1** — `OTP_EXPOSE_CODE` / `OTP_BYPASS` documentés comme **dev only**, à laisser `false` en production.
- Chiffrement **AES-256-GCM** et hachage **Argon2id** conservés à l'identique.

---

## Modules portés (tous)

| Module | Endpoints | Statut |
|--------|-----------|--------|
| auth | login/OTP, me, profile, change/forgot/reset password | ✅ |
| votes | check, request-otp, cast (AES-256-GCM, anti-double-vote) | ✅ |
| elections | CRUD, positions, changement de statut | ✅ |
| tally | dépouillement, résultats (correctifs **C1** + **E2**) | ✅ |
| candidacies | soumission, validation, rejet, retrait, conditions | ✅ |
| users | CRUD, recherche, import/export CSV, reset password | ✅ |
| dashboard | stats, charts, live-scores, activité récente | ✅ |
| audit | journal filtrable | ✅ |
| organizations | lookup, register, CRUD, admins, branding | ✅ |
| upload | photos/vidéos (extension dérivée du MIME) | ✅ |

Chaque module suit le même patron : Contrôleur + Service + Form Requests + API Resource camelCase + routes dans `routes/api.php` avec `middleware('role:...')`.

Scripts de test fournis à la racine : `test-vote.sh`, `test-elections.sh`, `test-candidacies.sh`, `test-users.sh`, `test-dashboard.sh`, `test-organizations.sh`.

### Pistes restantes (optionnelles)

- **Emails** : le module d'envoi (OTP, bienvenue, notifications) est en mode « log » ; brancher un vrai transport SMTP/Mailable si besoin.
- **Cloudinary** : l'upload utilise le disque local ; un driver Cloudinary peut être ajouté.
- **Brancher le frontend React** : pointer `VITE_API_URL` vers `http://localhost:3001/api`.
