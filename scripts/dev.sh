#!/usr/bin/env bash
# Starts the backend and the NiceGUI frontend. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

export BACKEND_PORT="${BACKEND_PORT:-8000}"
export BACKEND_URL="http://127.0.0.1:$BACKEND_PORT"
export NICEGUI_PORT="${NICEGUI_PORT:-8081}"

trap 'kill 0' EXIT INT TERM
(cd apps/backend && uv run opaprikkie-backend) &
(cd apps/web && uv run opaprikkie-web) &

echo
echo "Backend API docs: $BACKEND_URL/docs"
echo "NiceGUI:          http://localhost:$NICEGUI_PORT"
wait
