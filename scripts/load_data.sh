#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_SCRIPT="${MLWARDEN_LOAD_DATA_SCRIPT:-"$ROOT_DIR/examples/seed_real_demo_data.py"}"

if [[ ! -f "$PYTHON_SCRIPT" ]]; then
  echo "Data loader not found: $PYTHON_SCRIPT" >&2
  exit 1
fi

if [[ -n "${PYTHON:-}" ]]; then
  PYTHON_BIN="$PYTHON"
elif [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "Python was not found. Install Python or set PYTHON=/path/to/python." >&2
  exit 1
fi

export MINI_TRACKER_URL="${MINI_TRACKER_URL:-${MLWARDEN_URL:-http://localhost:8000}}"
export MINI_TRACKER_API_KEY="${MINI_TRACKER_API_KEY:-${MLWARDEN_API_KEY:-dev-api-key}}"
export MINI_TRACKER_PROJECT="${MINI_TRACKER_PROJECT:-${MLWARDEN_PROJECT:-demo-pytorch-tensorflow}}"
export MINI_TRACKER_FRONTEND_URL="${MINI_TRACKER_FRONTEND_URL:-${MLWARDEN_FRONTEND_URL:-http://localhost:5173}}"

cd "$ROOT_DIR"

echo "Loading MLWarden demo data with:"
echo "  backend:  $MINI_TRACKER_URL"
echo "  project:  $MINI_TRACKER_PROJECT"
echo "  frontend: $MINI_TRACKER_FRONTEND_URL"

exec "$PYTHON_BIN" "$PYTHON_SCRIPT" "$@"
