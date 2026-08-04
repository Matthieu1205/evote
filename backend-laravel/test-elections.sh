#!/usr/bin/env bash
# Test du module elections + tally (lecture + contrôle d'accès C1).
# Usage : bash test-elections.sh
# Prérequis : serveur lancé + OTP_EXPOSE_CODE=true.

BASE=http://localhost:3001/api
ORG=demo
EMAIL=electeur@evote.local
PASS='Pharma2026!'

extract_code() { grep -o '"devCode":"[0-9]*"' | grep -o '[0-9]*'; }
extract_token() { grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"//'; }

echo "=== Connexion (électeur) ==="
OTP=$(curl -s -X POST $BASE/auth/request-otp -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | extract_code)
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"otp\":\"$OTP\"}" | extract_token)
echo ">> token = $TOKEN"
echo

echo "=== 1) Liste des élections (GET /elections) ==="
curl -s $BASE/elections -H "Authorization: Bearer $TOKEN"
echo; echo

ELECTION=01kyq0wfb7gv0pr36w08pgmaqk
echo "=== 2) Détail de l'élection (GET /elections/{id}) ==="
curl -s $BASE/elections/$ELECTION -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 3) Résultats temps réel en tant qu'ÉLECTEUR (attendu : 403 — correctif C1) ==="
curl -s $BASE/elections/$ELECTION/live-results -H "Authorization: Bearer $TOKEN"
echo
