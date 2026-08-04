# Audit de sécurité — eVote

**Date :** 29 juillet 2026
**Périmètre :** backend NestJS (`backend/src`), frontend Vite/React, configuration et secrets.
**Méthode :** revue de code manuelle (crypto, auth/session, intégrité du vote, dépouillement, config, dépendances).

---

## Synthèse

La base est solide sur les fondamentaux cryptographiques : chiffrement AES-256-GCM des bulletins, hachage Argon2id, séparation architecturale bulletin/émargement, contrainte d'unicité anti-double-vote. Les failles restantes concernent surtout **le contrôle d'accès aux résultats** et **la configuration réseau/session**.

| Sévérité | Nombre |
|----------|--------|
| Critique | 1 |
| Élevé | 2 |
| Moyen | 4 |
| Faible / hygiène | 5 |

---

## Critique

### C1 — Résultats en temps réel accessibles à tout électeur pendant le vote
`backend/src/tally/tally.controller.ts`

Les routes `GET /elections/:id/live-results` et `GET /elections/:id/results` n'ont **aucun décorateur `@Roles`** : elles ne sont protégées que par l'authentification globale. Or `getLiveResults` appelle `computeTally` **sans vérifier le statut de l'élection**.

**Conséquence :** n'importe quel électeur connecté peut récupérer le dépouillement complet (voix par candidat, taux de participation) **pendant que le scrutin est encore OUVERT**. Cela casse l'équité du scrutin (effet d'entraînement / bandwagon) et constitue une fuite de résultats.

**Correctif :**
- Réserver `live-results` à `@Roles(Role.COMMISSION, Role.ADMIN, Role.OBSERVATEUR)`.
- Bloquer le calcul si `status !== 'CLOS'` (ou le limiter à la commission de surveillance selon le règlement électoral).
- Appliquer `@Roles` aussi à `getResults`.

---

## Élevé

### E1 — CORS reflète tous les domaines `*.vercel.app` avec `credentials:true`
`backend/src/main.ts`

La politique CORS autorise l'origine configurée **plus toute origine correspondant à `https://<x>.vercel.app`**, avec `credentials: true` et un cookie de session `SameSite=none` en production.

**Conséquence :** n'importe qui peut déployer un site sur `*.vercel.app`. Si un utilisateur connecté visite un tel site malveillant, celui-ci peut émettre des requêtes authentifiées vers l'API (cookie envoyé en cross-site) **et lire les réponses** (CORS l'y autorise) → CSRF + exfiltration de données.

**Correctif :** restreindre l'`origin` à une allowlist explicite de domaines de confiance. Ne pas utiliser de motif générique en production.

### E2 — Résultats visibles dès le dépouillement, avant publication officielle
`backend/src/tally/tally.service.ts` (`getResults`)

`getResults` autorise l'accès dès que le statut est `DEPOUILLE`, c'est-à-dire **avant** la publication officielle (`PUBLIE`). Combiné à l'absence de `@Roles` (voir C1), tout électeur voit les résultats entre le dépouillement et la publication.

**Correctif :** n'exposer les résultats aux électeurs que sur `status === 'PUBLIE'` ; réserver l'accès en état `DEPOUILLE` à la commission/admin.

---

## Moyen

### M1 — Token bearer non révocable, stocké en sessionStorage
`backend/src/auth/auth.service.ts` (`signToken`), `backend/src/common/guards/session.guard.ts`, `frontend/src/lib/api.ts`

Le token HMAC de secours est valable 8 h et **ne peut pas être révoqué** : `logout` détruit la session serveur mais pas le token. Le guard ne re-vérifie ni le statut ni le rôle en base — un compte suspendu/radié ou rétrogradé conserve ses droits jusqu'à expiration. Le token est stocké en `sessionStorage`, donc volable par XSS (8 h d'accès complet).

**Correctif :** durée de vie courte + rotation, ou liste de révocation (jti) ; re-vérification du statut/rôle en base dans le guard pour les actions sensibles.

### M2 — Absence de protection CSRF explicite
La défense repose uniquement sur CORS + preflight pour les requêtes JSON. La faille E1 neutralise cette protection pour les origines `vercel.app`.

**Correctif :** token anti-CSRF (double-submit) ou `SameSite=Lax/Strict`, en plus du durcissement CORS.

### M3 — Énumération de comptes
`backend/src/auth/auth.service.ts`

`resetPassword` renvoie « Compte introuvable » (incohérent avec le message générique de `forgotPassword`). `login`/`requestOtp` révèlent « Ce compte est suspendu ou radié » après un mot de passe correct.

**Correctif :** uniformiser les réponses (message générique), y compris pour l'état du compte.

### M4 — Bulletins indéchiffrables ignorés silencieusement au dépouillement
`backend/src/tally/tally.service.ts`

Un bulletin qui échoue au déchiffrement est ignoré (`continue`) sans alerte ni log. Une altération de la base (bulletins corrompus/supprimés) disparaîtrait du décompte sans être détectée.

**Correctif :** journaliser tout échec de déchiffrement, comptabiliser les bulletins ignorés, et réconcilier `nombre de bulletins` vs `nombre d'émargements (VoteRecord)` au dépouillement.

---

## Faible / hygiène

### F1 — Drapeaux de développement dangereux en production
`backend/.env`

`OTP_EXPOSE_CODE=true` renvoie le code OTP dans la réponse API (contourne totalement l'OTP). `OTP_BYPASS=true` désactive l'OTP à la connexion. La clé `BALLOT_ENCRYPTION_KEY` de test (`000…`) et un `SESSION_SECRET` de dev sont présents.

**Correctif :** garantir en production `OTP_EXPOSE_CODE=false`, `OTP_BYPASS` absent, une `BALLOT_ENCRYPTION_KEY` aléatoire forte (64 hex), un `SESSION_SECRET` fort, et **`NODE_ENV=production`** (sinon les cookies ne sont ni `secure` ni `SameSite=none`). Valider ces invariants au démarrage.

### F2 — Upload sans quota ni rate-limit par utilisateur
`backend/src/upload.controller.ts` — vidéos jusqu'à 80 Mo, aucune limite par compte : risque de saturation disque (local) ou de coûts Cloudinary. Ajouter un throttling/quota.

### F3 — Corrélation résiduelle bulletin/émargement
Le jitter d'horodatage empêche la jointure temporelle, mais un attaquant à accès base directe pourrait corréler via l'ordre physique d'insertion des lignes (ctid Postgres). Résiduel ; envisager une insertion différée/mélangée des bulletins si le modèle de menace inclut le DBA.

### F4 — Scoping tenant en défense en profondeur
`users.service.ts` (`update`) utilise `where: { id }` sans `organizationId` (compensé par `findOne` en amont). Ajouter `organizationId` au `where` par principe.

### F5 — `npm audit` non exécuté
L'audit des dépendances n'a pas pu être lancé dans l'environnement d'analyse (réseau restreint). À exécuter en CI : `npm audit --omit=dev` sur `backend/` et `frontend/`.

---

## Points positifs

- **AES-256-GCM** correct : IV aléatoire par bulletin, `authTag` vérifié, clé validée (64 hex).
- **Argon2id** avec paramètres conformes OWASP (mémoire 19 Mo, itérations 2).
- **Séparation bulletin/émargement** : `Ballot` sans `userId`, + jitter temporel anti-corrélation.
- **Anti-double-vote** garanti par contrainte unique `@@unique([electionId, userId, round])`.
- **Vérification de token timing-safe** (`crypto.timingSafeEqual`, contrôle de longueur, `exp`).
- **Helmet**, validation DTO stricte (`whitelist` + `forbidNonWhitelisted`), throttling, guard anti-escalade `SUPER_ADMIN`.
- **Aucun secret commité** ; `.gitignore` correct, `.env` non suivi.

---

## Priorisation recommandée

1. **C1** — verrouiller `live-results` / `results` (rôle + statut). *Bloquant avant tout scrutin réel.*
2. **E1** — durcir le CORS (allowlist stricte).
3. **E2** — n'exposer les résultats aux électeurs qu'en état `PUBLIE`.
4. **M1–M4** — révocation de session, CSRF, uniformisation des messages, contrôle d'intégrité au dépouillement.
5. **F1** — invariants d'environnement de production validés au démarrage.
