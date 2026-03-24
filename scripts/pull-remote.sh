#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <environment-label> <env-prefix> <mode:full|content> [--force]" >&2
  exit 1
fi

ENV_LABEL="$1"
ENV_PREFIX="$2"
MODE="$3"
FORCE="${4-}"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

require_var() {
  local name="$1"
  if [[ -z "${!name-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

remote_path_from_app_root() {
  local app_path="$1"
  local input_path="$2"
  if [[ "$input_path" == /* ]]; then
    printf '%s\n' "$input_path"
  else
    printf '%s/%s\n' "${app_path%/}" "${input_path#./}"
  fi
}

require_clean_git() {
  if [[ "$FORCE" == "--force" ]]; then
    return
  fi

  if [[ "$MODE" == "content" ]]; then
    if ! git diff --quiet -- config/project || ! git diff --cached --quiet -- config/project; then
      echo "Tracked local changes in config/project detected. Commit/stash them first, or rerun with --force." >&2
      exit 1
    fi
    return
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Tracked local changes detected. Commit/stash them first, or rerun with --force." >&2
    exit 1
  fi
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "$command_name is required for this pull script." >&2
    exit 1
  fi
}

remote_exists() {
  local remote_path="$1"
  ssh "$SSH_TARGET" "test -e \"$remote_path\""
}

sync_remote_dir() {
  local relative_path="$1"
  local local_path="$2"

  if ! remote_exists "$APP_PATH/$relative_path"; then
    return
  fi

  rsync -az --delete --no-times --omit-dir-times --no-perms \
    --exclude ".git/" \
    --exclude ".env" \
    --exclude ".ddev/" \
    --exclude "storage/" \
    --exclude "vendor/" \
    --exclude "node_modules/" \
    --exclude "web/uploads/" \
    --exclude "web/cpresources/" \
    "$SSH_TARGET:$APP_PATH/$relative_path/" "$local_path/"
}

sync_remote_file() {
  local relative_path="$1"
  local local_path="$2"

  if ! remote_exists "$APP_PATH/$relative_path"; then
    return
  fi

  rsync -az --no-times --omit-dir-times --no-perms \
    "$SSH_TARGET:$APP_PATH/$relative_path" "$local_path"
}

SSH_VAR="${ENV_PREFIX}_SSH"
APP_PATH_VAR="${ENV_PREFIX}_APP_PATH"
DB_HOST_VAR="${ENV_PREFIX}_DB_HOST"
DB_NAME_VAR="${ENV_PREFIX}_DB_NAME"
DB_USER_VAR="${ENV_PREFIX}_DB_USER"
DB_PASS_VAR="${ENV_PREFIX}_DB_PASS"
DB_PORT_VAR="${ENV_PREFIX}_DB_PORT"
TMP_PATH_VAR="${ENV_PREFIX}_TMP_PATH"

for var in "$SSH_VAR" "$APP_PATH_VAR" "$DB_HOST_VAR" "$DB_NAME_VAR" "$DB_USER_VAR" "$DB_PASS_VAR" "$DB_PORT_VAR" "$TMP_PATH_VAR"; do
  require_var "$var"
done

require_command rsync
require_command ssh
require_command ddev

if [[ "$MODE" != "full" && "$MODE" != "content" ]]; then
  echo "Invalid mode: $MODE. Use 'full' or 'content'." >&2
  exit 1
fi

require_clean_git

SSH_TARGET="${!SSH_VAR}"
APP_PATH="${!APP_PATH_VAR}"
DB_HOST="${!DB_HOST_VAR}"
DB_NAME="${!DB_NAME_VAR}"
DB_USER="${!DB_USER_VAR}"
DB_PASS="${!DB_PASS_VAR}"
DB_PORT="${!DB_PORT_VAR}"
TMP_PATH="${!TMP_PATH_VAR}"
REMOTE_TMP_PATH="$(remote_path_from_app_root "$APP_PATH" "$TMP_PATH")"

echo "Starting DDEV..."
ddev start

if [[ "$MODE" == "full" ]]; then
  echo "Syncing ${ENV_LABEL} code to local..."
  sync_remote_dir "templates" "./templates"
  sync_remote_dir "modules" "./modules"
  sync_remote_dir "config" "./config"
  sync_remote_dir "scripts" "./scripts"
  sync_remote_dir "js" "./js"
  sync_remote_dir "scss" "./scss"
  sync_remote_dir "web/assets" "./web/assets"

  sync_remote_file "web/.htaccess" "./web/"
  sync_remote_file "web/robots.txt" "./web/"
  sync_remote_file "bootstrap.php" "./"
  sync_remote_file "composer.json" "./"
  sync_remote_file "composer.lock" "./"
  sync_remote_file "craft" "./"
  sync_remote_file "index.php" "./"
  sync_remote_file "package.json" "./"
  sync_remote_file "package-lock.json" "./"
  sync_remote_file "postcss.config.js" "./"
  sync_remote_file "prettier.config.cjs" "./"
  sync_remote_file "tailwind.config.js" "./"
  sync_remote_file "webpack.config.js" "./"
  sync_remote_file "README.md" "./"
  sync_remote_file ".gitignore" "./"
else
  echo "Syncing ${ENV_LABEL} project config to local..."
  sync_remote_dir "config/project" "./config/project"
fi

BACKUP_DIR="storage/backups"
mkdir -p "$BACKUP_DIR"
LOCAL_BACKUP="$BACKUP_DIR/${ENV_LABEL}-$(date +%Y%m%d-%H%M%S).sql.gz"
REMOTE_BACKUP="$REMOTE_TMP_PATH/${ENV_LABEL}-pull.sql.gz"

echo "Creating ${ENV_LABEL} DB dump on remote..."
ssh "$SSH_TARGET" "mkdir -p \"$REMOTE_TMP_PATH\" && mysqldump -h \"$DB_HOST\" -P \"$DB_PORT\" -u \"$DB_USER\" -p\"$DB_PASS\" \"$DB_NAME\" | gzip > \"$REMOTE_BACKUP\""

echo "Downloading ${ENV_LABEL} DB dump..."
rsync -az "$SSH_TARGET:$REMOTE_BACKUP" "$LOCAL_BACKUP"
ssh "$SSH_TARGET" "rm -f \"$REMOTE_BACKUP\""

echo "Importing ${ENV_LABEL} DB into local DDEV..."
ddev import-db --file "$LOCAL_BACKUP"

if [[ "$MODE" == "full" ]]; then
  echo "Installing local dependencies..."
  ddev composer install
  npm install

  echo "Applying local Craft state..."
  ddev craft migrate/all --interactive=0
  ddev craft project-config/apply --force
else
  echo "Applying local Craft project config after ${ENV_LABEL} content pull..."
  ddev craft project-config/apply --force
fi

ddev craft clear-caches/all

echo "Pull from ${ENV_LABEL} (${MODE}) complete."
