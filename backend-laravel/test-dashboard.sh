#!/usr/bin/env bash
# Test des modules dashboard + audit.
# Usage : bash test-dashboard.sh   —   Prérequis : serveur lancé + OTP_EXPOSE_CODE=true.

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
echo

echo "=== 1) Statistiques (GET /dashboard/stats) ==="
curl -s $BASE/dashboard/stats -H "Authorization: Bearer $TOKEN"; echo; echo

echo "=== 2) Graphiques (GET /dashboard/charts) ==="
curl -s $BASE/dashboard/charts -H "Authorization: Bearer $TOKEN"; echo; echo

echo "=== 3) Scores en direct (GET /dashboard/live-scores) ==="
curl -s $BASE/dashboard/live-scores -H "Authorization: Bearer $TOKEN"; echo; echo

echo "=== 4) Activité récente (GET /dashboard/recent-activity?limit=5) ==="
curl -s "$BASE/dashboard/recent-activity?limit=5" -H "Authorization: Bearer $TOKEN"; echo; echo

echo "=== 5) Journal d'audit (GET /audit?limit=5) ==="
curl -s "$BASE/audit?limit=5" -H "Authorization: Bearer $TOKEN"; echo
