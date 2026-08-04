#!/usr/bin/env bash
# Test du module users (gestion des membres).
# Usage : bash test-users.sh   —   Prérequis : serveur lancé + OTP_EXPOSE_CODE=true.

BASE=http://localhost:3001/api
ORG=demo
EMAIL=admin@evote.local
PASS='Pharma2026!'

extract_code() { grep -o '"devCode":"[0-9]*"' | grep -o '[0-9]*'; }
extract_token() { grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"//'; }

echo "=== Connexion (admin) ==="
OTP=$(curl -s -X POST $BASE/auth/request-otp -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | extract_code)
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"otp\":\"$OTP\"}" | extract_token)
echo ">> token = $TOKEN"
echo

echo "=== 1) Liste des membres (GET /users) — 4 attendus ==="
curl -s "$BASE/users" -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 2) Créer un membre (POST /users) — numéro d'ordre auto-généré ==="
curl -s -X POST $BASE/users -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"nouveau@evote.local","firstName":"Nadia","lastName":"Nouvelle","role":"ELECTEUR","section":"Nord"}'
echo; echo

echo "=== 3) Liste filtrée (GET /users?search=Nadia) ==="
curl -s "$BASE/users?search=Nadia" -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 4) Export CSV (GET /users/export) ==="
curl -s "$BASE/users/export" -H "Authorization: Bearer $TOKEN"
echo
