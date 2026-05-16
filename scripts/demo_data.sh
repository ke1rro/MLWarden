#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
exec scripts/load_data.sh "$@"
