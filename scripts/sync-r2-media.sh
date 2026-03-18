#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

REQUIRED_VARS=(R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT)
for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR-}" ]]; then
    echo "Missing required env var: $VAR" >&2
    exit 1
  fi
done

if ! command -v aws >/dev/null 2>&1; then
  echo "The AWS CLI is required. Install it, then rerun this script." >&2
  exit 1
fi

LOCAL_DIR="${LOCAL_MEDIA_DIR:-web/uploads}"
if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "Local media directory not found: $LOCAL_DIR" >&2
  exit 1
fi

REMOTE_PREFIX="${R2_SUBFOLDER:-uploads}"
REMOTE_PREFIX="${REMOTE_PREFIX#/}"
REMOTE_PREFIX="${REMOTE_PREFIX%/}"

AWS_ARGS=(
  s3
  sync
  "${LOCAL_DIR%/}/"
  "s3://${R2_BUCKET}/${REMOTE_PREFIX}/"
  --endpoint-url "$R2_ENDPOINT"
  --exclude ".DS_Store"
)

if [[ "${1-}" == "--dry-run" || "${2-}" == "--dry-run" ]]; then
  AWS_ARGS+=(--dryrun)
fi

if [[ "${1-}" == "--delete" || "${2-}" == "--delete" ]]; then
  AWS_ARGS+=(--delete)
fi

echo "Syncing ${LOCAL_DIR}/ to s3://${R2_BUCKET}/${REMOTE_PREFIX}/"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION="${R2_REGION:-auto}" \
aws "${AWS_ARGS[@]}"

echo "Done."
