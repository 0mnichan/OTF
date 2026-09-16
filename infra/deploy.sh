#!/usr/bin/env bash
# One-command bring-up for a single-VM OTF deployment.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Create .env first: cp .env.example .env && edit OTF_SECRET"; exit 1; }
if grep -q 'change-me' .env; then
  echo "WARNING: .env still contains a 'change-me' placeholder. Set real secrets before exposing this host."
fi

echo "==> Building lab images"
./infra/build-labs.sh

echo "==> Building and starting the platform"
docker compose -f infra/docker-compose.yml up -d --build

echo "==> Waiting for health"
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://localhost/ 2>/dev/null; then echo "OTF is up on http://localhost/"; exit 0; fi
  sleep 2
done
echo "Platform did not become healthy in time; check: docker compose -f infra/docker-compose.yml logs"
exit 1
