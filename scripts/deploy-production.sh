#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

REQUIRED_VARS=(PROD_SSH PROD_APP_PATH PROD_DB_HOST PROD_DB_NAME PROD_DB_USER PROD_DB_PASS PROD_DB_PORT PROD_TMP_PATH)
for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR-}" ]]; then
    echo "Missing required env var: $VAR" >&2
    exit 1
  fi
done

remote_path_from_app_root() {
  local app_path="$1"
  local input_path="$2"
  if [[ "$input_path" == /* ]]; then
    printf '%s\n' "$input_path"
  else
    printf '%s/%s\n' "${app_path%/}" "${input_path#./}"
  fi
}

npm run build

COMMIT_MSG="${1-}"
if [[ -z "$COMMIT_MSG" ]]; then
  if [[ -t 0 ]]; then
    read -r -p "Commit message: " COMMIT_MSG
  fi
fi

git add -A
if ! git diff --cached --quiet; then
  if [[ -z "$COMMIT_MSG" ]]; then
    echo "Commit message required (pass as first arg if running non-interactively)." >&2
    exit 1
  fi
  git commit -m "$COMMIT_MSG"
else
  echo "No changes to commit."
fi

git push origin HEAD:main

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for deploy (install rsync and retry)." >&2
  exit 1
fi

echo "Syncing code to production..."
rsync -az --delete --no-times --omit-dir-times --no-perms \
  --exclude "storage/" \
  --exclude "web/uploads/" \
  --exclude "web/cpresources/" \
  ./templates ./modules ./config ./bootstrap.php ./composer.json ./composer.lock ./craft \
  "$PROD_SSH:$PROD_APP_PATH/"

rsync -az --delete --no-times --omit-dir-times --no-perms \
  ./web/assets ./web/.htaccess ./web/robots.txt \
  "$PROD_SSH:$PROD_APP_PATH/web/"

BACKUP_DIR="storage/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE=""
if command -v ddev >/dev/null 2>&1 && [[ -d ".ddev" ]]; then
  BACKUP_FILE="$BACKUP_DIR/local-$(date +%Y%m%d-%H%M%S).sql.gz"
  ddev export-db --file "$BACKUP_FILE"
else
  php -d error_reporting="E_ALL & ~E_DEPRECATED" craft db/backup
fi

if [[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]]; then
  LATEST_BACKUP="$BACKUP_FILE"
else
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql "$BACKUP_DIR"/*.sql.gz "$BACKUP_DIR"/*.zip 2>/dev/null | head -n 1 || true)
fi

if [[ -z "$LATEST_BACKUP" ]]; then
  echo "No DB backup found in $BACKUP_DIR" >&2
  exit 1
fi

REMOTE_TMP_PATH=$(remote_path_from_app_root "$PROD_APP_PATH" "$PROD_TMP_PATH")

echo "Uploading DB backup to production..."
ssh "$PROD_SSH" "mkdir -p \"$REMOTE_TMP_PATH\""
rsync -az "$LATEST_BACKUP" "$PROD_SSH:$REMOTE_TMP_PATH/"
REMOTE_BACKUP="$REMOTE_TMP_PATH/$(basename "$LATEST_BACKUP")"

ssh "$PROD_SSH" bash -lc "'
  set -euo pipefail
  umask 0002
  cd ${PROD_APP_PATH}
  mkdir -p storage/runtime/{cache,compiled_templates,temp} storage/logs storage/backups web/cpresources
  find storage/runtime storage/logs storage/backups web/cpresources -type d -exec chmod ug+rwx {} + >/dev/null 2>&1 || true
  composer install --no-dev --optimize-autoloader --no-interaction
  if [[ ! -d vendor/nystudio107/craft-code-editor/src/web/assets/dist ]]; then
    echo \"SEOmatic dependency assets missing; reinstalling nystudio107/craft-code-editor...\"
    composer reinstall nystudio107/craft-code-editor --no-interaction
  fi

  if [[ \"${REMOTE_BACKUP}\" == *.gz ]]; then
    gunzip -c \"${REMOTE_BACKUP}\" | mysql -h ${PROD_DB_HOST} -P ${PROD_DB_PORT} -u ${PROD_DB_USER} -p${PROD_DB_PASS} ${PROD_DB_NAME}
  elif [[ \"${REMOTE_BACKUP}\" == *.zip ]]; then
    unzip -p \"${REMOTE_BACKUP}\" | mysql -h ${PROD_DB_HOST} -P ${PROD_DB_PORT} -u ${PROD_DB_USER} -p${PROD_DB_PASS} ${PROD_DB_NAME}
  else
    mysql -h ${PROD_DB_HOST} -P ${PROD_DB_PORT} -u ${PROD_DB_USER} -p${PROD_DB_PASS} ${PROD_DB_NAME} < \"${REMOTE_BACKUP}\"
  fi
  rm -f ${REMOTE_BACKUP}
  rm -rf storage/runtime/compiled_templates/* >/dev/null 2>&1 || true
  php craft migrate/all --interactive=0
  php craft project-config/apply --force --quiet
  php craft clear-caches/all
  find storage/runtime storage/logs storage/backups web/cpresources -type d -exec chmod ug+rwx {} + >/dev/null 2>&1 || true
  find storage/runtime storage/logs storage/backups web/cpresources -type f -exec chmod ug+rw {} + >/dev/null 2>&1 || true
'"

if [[ -n "${CLOUDFLARE_CACHE_API_TOKEN-}" && -n "${CF_ZONE_ID-}" ]]; then
  echo "Purging Cloudflare cache for zone ${CF_ZONE_ID}..."
  CF_RESPONSE=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_CACHE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')
  if ! echo "$CF_RESPONSE" | grep -q '"success":[[:space:]]*true'; then
    echo "Cloudflare purge failed: $CF_RESPONSE" >&2
    exit 1
  fi
else
  echo "Skipping Cloudflare purge (set both CLOUDFLARE_CACHE_API_TOKEN and CF_ZONE_ID)."
fi

echo "Done."
