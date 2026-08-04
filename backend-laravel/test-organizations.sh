#!/usr/bin/env bash
# Test du module organizations (lookup public + branding).
# Usage : bash test-organizations.sh   —   Prérequis : serveur lancé + OTP_EXPOSE_CODE=true.

BASE=http://localhost:3001/api
ORG=demo
EMAIL=admin@evote.local
PASS='Pharma2026!'

extract_code() { grep -o '"devCode":"[0-9]*"' | grep -o '[0-9]*'; }
extract_token() { grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"//'; }

echo "=== 1) Lookup public (GET /organizations/lookup?slug=demo) — sans authentification ==="
curl -s "$BASE/organizations/lookup?slug=demo"; echo; echo

echo "=== Connexion (admin) ==="
OTP=$(curl -s -X POST $BASE/auth/request-otp -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | extract_code)
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"otp\":\"$OTP\"}" | extract_token)
echo

echo "=== 2) Mise à jour du branding (PUT /organizations/me, admin) ==="
curl -s -X PUT $BASE/organizations/me -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Organisation Demo (mise a jour)","primaryColor":"#1d4ed8"}'
echo; echo

echo "=== 3) Lookup public apres mise a jour — le nom a change ==="
curl -s "$BASE/organizations/lookup?slug=demo"; echo
