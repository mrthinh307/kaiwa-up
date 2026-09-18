#!/bin/bash
set -euo pipefail

# ponytail: API and worker share one sleeping Free instance; split when upgrading hosting.
pids=()
cleanup() {
    trap '' TERM INT
    if ((${#pids[@]})); then
        kill -TERM "${pids[@]}" 2>/dev/null || true
        # Leave time for durable jobs to finish, but don't hang shutdown indefinitely.
        (sleep 20; kill -KILL "${pids[@]}" 2>/dev/null || true) &
        watchdog=$!
        wait "${pids[@]}" 2>/dev/null || true
        kill -KILL "$watchdog" 2>/dev/null || true
        wait "$watchdog" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 0' TERM INT

.venv/bin/python -m app.workers.shadowing &
pids+=("$!")
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1 &
pids+=("$!")

status=0
wait -n "${pids[@]}" || status=$?
echo "API or Shadowing worker exited; stopping container (status=$status)." >&2
# Even a clean child exit is unexpected for these long-running services.
if ((status == 0)); then status=1; fi
exit "$status"
