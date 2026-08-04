#!/usr/bin/env bash
# Test du module candidacies (admin voit toutes les candidatures + conditions).
# Usage : bash test-candidacies.sh
# Prérequis : serveur lancé + OTP_EXPOSE_CODE=true.

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

echo "=== 1) Toutes les candidatures (GET /candidacies) — 2 attendues, validées ==="
curl -s $BASE/candidacies -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 2) Conditions de candidature (GET /candidacies/conditions) — vide au départ ==="
curl -s $BASE/candidacies/conditions -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 3) Créer une condition (POST /candidacies/conditions, admin) ==="
curl -s -X POST $BASE/candidacies/conditions -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"text":"A jour de ses cotisations","order":0}'
echo; echo

echo "=== 4) Conditions après création ==="
curl -s $BASE/candidacies/conditions -H "Authorization: Bearer $TOKEN"
echo
