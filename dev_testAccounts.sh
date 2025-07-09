#!/bin/bash
set -euo pipefail

API_URL=${API_URL:-https://localhost:4242/auth/register}
LOGIN_URL=${LOGIN_URL:-https://localhost:4242/auth/authenticate}
AVATAR_UPLOAD_URL=${AVATAR_UPLOAD_URL:-https://localhost:4242/users/me/settings/avatar}
PASSWORD=password
AVATARS_FOLDER=${AVATARS_FOLDER:-./avatars}

declare -a USERS=(
  "test:test@test.com"
  "testjdagoy:jdagoy@test.com"
  "testcortiz:cortiz@test.com"
  "testdopeyrat:dopeyrat@test.com"
  "user:user@test.com"
  "testmfa:mfa@test.com"
)

login_user() {
  local username=$1
  local password=$2
  
  local response=$(curl -k -s \
    -H 'Content-Type: application/json' \
    -X POST "$LOGIN_URL" \
    -d "{\"username\":\"$username\",\"password\":\"$password\"}")
  
  local token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "$token"
}

upload_avatar() {
  local username=$1
  local token=$2
  local avatar_file="$AVATARS_FOLDER/$username.png"
  
  if [[ ! -f "$avatar_file" ]]; then
    echo "⚠️  Avatar file not found for $username: $avatar_file"
    return 1
  fi
  
  local status=$(curl -k -s -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $token" \
    -X PUT "$AVATAR_UPLOAD_URL" \
    -F "avatar=@$avatar_file")
  
  case "$status" in
    200|201) echo "🖼️  Avatar uploaded for $username";;
    401)     echo "❌  Authentication failed for $username avatar upload";;
    413)     echo "❌  Avatar file too large for $username";;
    *)       echo "❌  Avatar upload failed for $username (HTTP $status)";;
  esac
}

for pair in "${USERS[@]}"; do
  IFS=: read -r USERNAME EMAIL <<<"$pair"
  
  echo "Processing user: $USERNAME"
  
  STATUS=$(curl -k -s -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -X POST "$API_URL" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"$EMAIL\"}")
  
  case "$STATUS" in
    200|201) echo "✅  $USERNAME created";;
    409)     echo "ℹ️  $USERNAME already exists – skipped";;
    *)       echo "❌  $USERNAME failed (HTTP $STATUS)"; exit 1;;
  esac
  
  echo "🔑  Logging in $USERNAME..."
  TOKEN=$(login_user "$USERNAME" "$PASSWORD")
  
  if [[ -z "$TOKEN" ]]; then
    echo "❌  Failed to get token for $USERNAME"
    continue
  fi
  
  echo "📤  Uploading avatar for $USERNAME..."
  upload_avatar "$USERNAME" "$TOKEN"
  
  echo "---"
done

echo "✅  All users processed!"
