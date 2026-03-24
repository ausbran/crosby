#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}"
FORCE="${2-}"

"$(dirname "$0")/pull-remote.sh" production PROD "$MODE" "$FORCE"
