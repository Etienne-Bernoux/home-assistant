#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
version=$(< "$root/tests/support/home-assistant-version")
config=$(mktemp -d)
container=

cleanup() {
  rm -rf "$config"
  if [ -n "$container" ]; then
    docker rm --force --volumes "$container" >/dev/null
  fi
}
trap cleanup EXIT

mkdir "$config/custom_templates"
git -C "$root" ls-files -z -- config/custom_templates | while IFS= read -r -d '' path; do
  cp "$root/$path" "$config/custom_templates/"
done
cp "$config/custom_templates/mylight.example.jinja" "$config/custom_templates/mylight.jinja"
printf 'homeassistant:\n  time_zone: Europe/Paris\napi:\nonboarding:\n' > "$config/configuration.yaml"

container=$(docker create --publish 127.0.0.1::8123 --volume /config \
  "ghcr.io/home-assistant/home-assistant:$version")
docker cp "$config/." "$container:/config"
docker start "$container" >/dev/null
HA_URL="http://$(docker port "$container" 8123/tcp)"

ready=false
for ((attempt = 0; attempt < 60; attempt++)); do
  if curl -fsS --max-time 2 "$HA_URL/api/onboarding" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" = false ]; then
  docker logs "$container" >&2
  exit 1
fi

client_id="$HA_URL/"
registration=$(jq -cn --arg client_id "$client_id" --arg password "$(openssl rand -hex 24)" \
  '{name:"Gherkin",username:"gherkin",password:$password,client_id:$client_id,language:"en"}')
code=$(curl -fsS --max-time 15 -H 'Content-Type: application/json' -d "$registration" \
  "$HA_URL/api/onboarding/users" | jq -er '.auth_code')
HA_TOKEN=$(curl -fsS --max-time 15 -d 'grant_type=authorization_code' \
  --data-urlencode "code=$code" --data-urlencode "client_id=$client_id" \
  "$HA_URL/auth/token" | jq -er '.access_token')
export HA_URL HA_TOKEN

actual_version=$(curl -fsS --max-time 15 --config - "$HA_URL/api/config" \
  <<< "header = \"Authorization: Bearer $HA_TOKEN\"" | jq -er '.version')
if [ "$actual_version" != "$version" ]; then
  printf 'Expected Home Assistant Core %s, got %s\n' "$version" "$actual_version" >&2
  exit 1
fi
printf 'Running against Home Assistant Core %s\n' "$actual_version"
npm test --prefix "$root/tests" -- --tags 'not @nyons' "$@"
