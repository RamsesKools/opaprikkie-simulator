#!/usr/bin/env bash
# Starts the backend and the React frontend. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

export BACKEND_PORT="${BACKEND_PORT:-8000}"
export BACKEND_URL="http://127.0.0.1:$BACKEND_PORT"

[ -d apps/web/node_modules ] || (cd apps/web && npm install --silent)

trap 'kill 0' EXIT INT TERM
(cd apps/backend && uv run opaprikkie-backend) &
(cd apps/web && npm run dev --silent) &

echo
echo "Backend API docs: $BACKEND_URL/docs"
echo "React:            http://localhost:5174"
wait
