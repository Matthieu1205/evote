#!/usr/bin/env bash
# Test automatique du flux auth + vote (tranche verticale eVote).
# Usage : bash test-vote.sh
# Prérequis : le serveur tourne (php artisan serve --port=3001)
#             et OTP_EXPOSE_CODE=true dans .env.

BASE=http://localhost:3001/api
ORG=demo
EMAIL=electeur@evote.local
PASS='Pharma2026!'

# IDs issus du seed (affichés par « php artisan db:seed »).
# Si tu relances « migrate:fresh --seed », mets à jour ces 3 valeurs.
ELECTION=01kyq0wfb7gv0pr36w08pgmaqk
POSITION=01kyq0wfb9g1whnr63sqxhdhh8
CANDIDACY=01kyq0wfbcdgq2xkz48vr5z8h0

extract_code() { grep -o '"devCode":"[0-9]*"' | grep -o '[0-9]*'; }
extract_token() { grep -o '"token":"[^"]*"' | sed 's/"token":"//; s/"//'; }

echo "=== 1) OTP de connexion ==="
R1=$(curl -s -X POST $BASE/auth/request-otp -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
echo "$R1"
OTP1=$(echo "$R1" | extract_code)
echo ">> code = $OTP1"
echo

echo "=== 2) Connexion ==="
R2=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d "{\"organizationSlug\":\"$ORG\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"otp\":\"$OTP1\"}")
echo "$R2"
TOKEN=$(echo "$R2" | extract_token)
echo ">> token = $TOKEN"
echo

if [ -z "$TOKEN" ]; then
  echo "!! Connexion échouée, arrêt."
  exit 1
fi

echo "=== 3) OTP de vote ==="
R3=$(curl -s -X POST $BASE/votes/request-otp/$ELECTION -H "Authorization: Bearer $TOKEN")
echo "$R3"
OTP2=$(echo "$R3" | extract_code)
echo ">> code = $OTP2"
echo

echo "=== 4) Vote (attendu : Vote enregistré avec succès) ==="
curl -s -X POST $BASE/votes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"electionId\":\"$ELECTION\",\"otp\":\"$OTP2\",\"choices\":{\"$POSITION\":[\"$CANDIDACY\"]}}"
echo
echo

echo "=== 5) Re-vote (attendu : refus 409 anti-double-vote) ==="
curl -s -X POST $BASE/votes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"electionId\":\"$ELECTION\",\"otp\":\"$OTP2\",\"choices\":{\"$POSITION\":[\"$CANDIDACY\"]}}"
echo
