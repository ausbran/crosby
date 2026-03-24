#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}"
FORCE="${2-}"

"$(dirname "$0")/pull-remote.sh" staging STAGING "$MODE" "$FORCE"
