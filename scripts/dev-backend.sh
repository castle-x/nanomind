#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEV_DIR="$ROOT_DIR/.dev"
PID_FILE="$DEV_DIR/backend.pid"
LOG_FILE="$DEV_DIR/backend.log"
BIN_FILE="$DEV_DIR/nanomind-dev"
BACKEND_HTTP="${BACKEND_HTTP:-localhost:8090}"
BACKEND_URL="http://${BACKEND_HTTP}"

mkdir -p "$DEV_DIR"

build_backend() {
  printf '[Building Backend Dev Binary]\n'
  (
    cd "$ROOT_DIR"
    ENV=dev go build -tags development -o "$BIN_FILE" ./cmd/server
  )
}

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    tr -d '[:space:]' <"$PID_FILE"
  fi
}

is_running() {
  local pid
  pid="$(read_pid)"
  [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null
}

clear_stale_pid() {
  if [[ -f "$PID_FILE" ]] && ! is_running; then
    rm -f "$PID_FILE"
  fi
}

start() {
  clear_stale_pid

  if is_running; then
    printf '[Backend Already Running] PID=%s %s\n' "$(read_pid)" "$BACKEND_URL"
    return 0
  fi

  build_backend
  : >"$LOG_FILE"
  printf '[Starting Backend In Background]\n'
  (
    cd "$ROOT_DIR"
    nohup env ENV=dev "$BIN_FILE" serve --http="$BACKEND_HTTP" >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )

  sleep 2

  if is_running; then
    printf '[Success] Backend started\n'
    printf '  PID:     %s\n' "$(read_pid)"
    printf '  URL:     %s\n' "$BACKEND_URL"
    printf '  Admin:   %s/_/\n' "$BACKEND_URL"
    printf '  Log:     %s\n' "${LOG_FILE#$ROOT_DIR/}"
    return 0
  fi

  printf '[Failed] Backend exited early, recent logs:\n'
  tail -n 20 "$LOG_FILE" 2>/dev/null || true
  rm -f "$PID_FILE"
  return 1
}

stop() {
  clear_stale_pid

  if ! [[ -f "$PID_FILE" ]]; then
    printf '[Stopped] Backend is not running\n'
    return 0
  fi

  local pid
  pid="$(read_pid)"
  printf '[Stopping Backend] PID=%s\n' "$pid"
  kill "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if kill -0 "$pid" 2>/dev/null; then
      sleep 0.2
      continue
    fi
    rm -f "$PID_FILE"
    printf '[Success] Backend stopped\n'
    return 0
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  printf '[Force Stopped] Backend stopped\n'
}

status() {
  clear_stale_pid

  if is_running; then
    printf '[Running] PID=%s %s\n' "$(read_pid)" "$BACKEND_URL"
    return 0
  fi

  printf '[Stopped] Backend is not running\n'
}

logs() {
  touch "$LOG_FILE"
  printf '[Tailing Logs] %s\n' "${LOG_FILE#$ROOT_DIR/}"
  tail -f "$LOG_FILE"
}

restart() {
  stop
  start
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  restart)
    restart
    ;;
  *)
    printf 'Usage: %s {start|stop|status|logs|restart}\n' "$(basename "$0")" >&2
    exit 1
    ;;
esac
