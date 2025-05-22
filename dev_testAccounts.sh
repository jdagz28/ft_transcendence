#!/usr/bin/bash
set -euo pipefail

API_URL=${API_URL:-https://localhost:4242/auth/register}
PASSWORD=password

#################
declare -a USERS=(
  "test:test@test.com"
  "jdagoy:jdagoy@test.com"
  "cortiz:cortiz@test.com"
  "dopeyrat:dopeyrat@test.com"
  "user:user@test.com"
)

#################
for pair in "${USERS[@]}"; do
  IFS=: read -r USERNAME EMAIL <<<"$pair"

  STATUS=$(curl -k -s -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -X POST "$API_URL" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\"}")

  case "$STATUS" in
    200|201) echo "✅  $USERNAME created";;
    409)     echo "ℹ️  $USERNAME already exists – skipped";;
    *)       echo "❌  $USERNAME failed (HTTP $STATUS)"; exit 1;;
  esac
done
