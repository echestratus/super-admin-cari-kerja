#!/usr/bin/env bash
# Remote staging deploy for super-admin-cari-kerja only (super-admin-stage).
# Invoked on the VPS by GitHub Actions after merge to develop.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/cari-kerja}"
SUPER_ADMIN_DIR="${SUPER_ADMIN_DIR:-super-admin-stage-cari-kerja}"
BRANCH="${BRANCH:-develop}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-super-admin-stage}"
HEALTH_URL="${HEALTH_URL:-https://su-stage.cari-kerja.co.id/}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_SLEEP_SEC="${HEALTH_SLEEP_SEC:-5}"

echo "========================================="
echo "  Cari Kerja Super Admin staging deploy"
echo "========================================="

cd "$PROJECT_DIR"

echo ""
echo "[1/4] Updating super-admin repository ($BRANCH)..."
git -C "$SUPER_ADMIN_DIR" fetch origin
git -C "$SUPER_ADMIN_DIR" checkout "$BRANCH"
git -C "$SUPER_ADMIN_DIR" pull --ff-only origin "$BRANCH"
echo "Revision: $(git -C "$SUPER_ADMIN_DIR" rev-parse --short HEAD)"

echo ""
echo "[2/4] Building & restarting Docker service: $COMPOSE_SERVICE"
# Rebuild only super-admin-stage — do not touch be-stage / fe-stage / production.
docker compose up -d --build "$COMPOSE_SERVICE"

echo ""
echo "[3/4] Soft prune dangling images (safe on shared VPS)..."
docker image prune -f

echo ""
echo "[4/4] Health check: $HEALTH_URL"
ok=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Health OK (attempt $i)"
    ok=1
    break
  fi
  echo "Waiting for health... ($i/$HEALTH_RETRIES)"
  sleep "$HEALTH_SLEEP_SEC"
done

if [[ "$ok" -ne 1 ]]; then
  echo "ERROR: health check failed after $HEALTH_RETRIES attempts"
  docker compose ps "$COMPOSE_SERVICE" || true
  docker compose logs --tail=80 "$COMPOSE_SERVICE" || true
  exit 1
fi

echo ""
echo "========================================="
echo "  Staging super-admin deploy succeeded"
echo "========================================="
