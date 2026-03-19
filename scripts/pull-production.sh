#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/pull-remote.sh" production PROD "${1-}"
