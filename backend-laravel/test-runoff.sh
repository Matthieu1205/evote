#!/usr/bin/env bash
# Test du second tour automatique.
# Prérequis :
#   1) php artisan db:seed --class=RunoffDemoSeeder   (note l'ID d'élection affiché)
#   2) serveur lancé + OTP_EXPOSE_CODE=true
# Usage : bash test-runoff.sh <ELECTION_ID>

BASE=http://localhost:3001/api
ORG=demo
EMAIL=admin@evote.local
PASS='Pharma2026!'
ELECTION="$1"

if [ -z "$ELECTION" ]; then
  echo "Usage : bash test-runoff.sh <ELECTION_ID>"
  echo "(l'ID est affiché par : php artisan db:seed --class=RunoffDemoSeeder)"
  exit 1
fi

extract_code() { grep -o '"devCode":"[0-9]*"' | grep -o '[0-9]*'; }
extract_token() { grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"//'; }

echo "=== Connexion (admin) ==="
OTP=$(curl -s -X POST $BASE/auth/request-otp -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | extract_code)
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"otp\":\"$OTP\"}" | extract_token)
echo

echo "=== 1) Résultats du tour 1 (3 candidats, aucun > 50 %) ==="
# Passe d'abord l'élection en DEPOUILLE pour pouvoir lire les résultats.
curl -s -X POST $BASE/elections/$ELECTION/tally -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"publish":false}'
echo; echo

echo "=== 2) Créer le second tour (POST /elections/{id}/runoff) ==="
curl -s -X POST $BASE/elections/$ELECTION/runoff -H "Authorization: Bearer $TOKEN"
echo; echo

echo "=== 3) Détail de l'élection après second tour (attendu : status OUVERT, currentRound 2, 2 candidats) ==="
curl -s $BASE/elections/$ELECTION -H "Authorization: Bearer $TOKEN"
echo
