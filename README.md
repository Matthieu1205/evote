# eVote — Plateforme de vote électronique
## Organiser vos élèctions en toutes securité

## Structure du projet

```
evote/
├── backend/      → API REST NestJS (port 3001)
├── frontend/     → Interface Vite + React (port 5173)
└── README.md
```

---

## Prérequis

- Node.js 20+
- PostgreSQL 15+ (base de données : `pharmavote`)
- npm 10+

---

## Installation

### 1. Backend (NestJS)

```bash
cd backend
cp .env.example .env        # puis éditer DATABASE_URL
npm install
npx prisma migrate dev      # crée les tables
npx prisma db seed          # données de démonstration (optionnel)
npm run start:dev           # démarre sur http://localhost:3001
```

### 2. Frontend (Vite + React)

```bash
cd frontend
cp .env.example .env.local  # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev                 # démarre sur http://localhost:5173
```

---

## Variables d''environnement

### backend/.env

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Connexion PostgreSQL |
| `SESSION_SECRET` | Clé secrète sessions (min 32 chars) |
| `BALLOT_ENCRYPTION_KEY` | Clé AES-256 bulletins (64 hex chars) |
| `SMTP_*` | Configuration email (OTP, notifications) |
| `FRONTEND_URL` | URL du frontend (pour CORS) |

### frontend/.env.local

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL de l''API backend |

---

## Comptes par défaut (après seed)

| Rôle | N° Ordre | Mot de passe |
|------|----------|--------------|
| Admin | ADMIN-001 | Pharma2026! |
| Commission | COM-001 | Pharma2026! |
| Observateur | OBS-001 | Pharma2026! |
| Électeur | PH-1000 | Pharma2026! |

---

## Architecture

```
Frontend :5173  ──── fetch /api/* ────►  Backend :3001
  Vite + React          cookies HTTP-only    NestJS + Prisma
  React Router                                     │
  TailwindCSS                                      ▼
                                           PostgreSQL
```
