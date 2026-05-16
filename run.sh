#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/mlwarden/frontend"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

export APP_ENV="${APP_ENV:-development}"
export APP_API_KEY="${APP_API_KEY:-dev-api-key}"
export APP_DATABASE_URL="${APP_DATABASE_URL:-sqlite:///./mlwarden.sqlite3}"
export APP_ARTIFACT_ROOT="${APP_ARTIFACT_ROOT:-./artifacts}"
export APP_CORS_ORIGINS="${APP_CORS_ORIGINS:-http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:$BACKEND_PORT}"
export VITE_WS_BASE_URL="${VITE_WS_BASE_URL:-ws://localhost:$BACKEND_PORT}"

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

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js/npm before running the frontend." >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Frontend dependencies are missing. Run: cd mlwarden/frontend && npm install" >&2
  exit 1
fi

PIDS=()

cleanup() {
  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo
    echo "Stopping MLWarden..."
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

echo "Starting MLWarden backend at http://localhost:$BACKEND_PORT"
"$PYTHON_BIN" -m uvicorn mlwarden.backend.app:app \
  --host "$BACKEND_HOST" \
  --port "$BACKEND_PORT" &
PIDS+=("$!")

echo "Starting MLWarden frontend at http://localhost:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
PIDS+=("$!")

echo
echo "MLWarden is starting:"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "Press Ctrl+C to stop both services."

wait -n "${PIDS[@]}"
exit_code="$?"
exit "$exit_code"
