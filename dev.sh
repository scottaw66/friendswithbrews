#!/bin/bash
# Preview/writing mode: one command, then just edit and save.
#
#   ./dev.sh   → http://127.0.0.1:1111 with live reload (opens browser)
#
# What it runs (all cleaned up on Ctrl-C):
#   - tools/prebuild.py once up front, then again automatically whenever
#     anything in content/, data/ or src/assets changes — it refreshes the
#     generated stubs (list pages, bottle pages) and the derived display
#     fields so a saved edit or a pipeline-written episode shows up
#     complete (zola serve itself only sees the raw file change)
#   - zola serve (foreground)
#
# /search works in dev (run ./preview.sh for a pagefind index first if you
# need results); /explore does NOT — its /api/search proxy only exists on
# production Apache (decided Phase 7; no local shim).

set -e
cd "$(dirname "$0")"

# Sweep leftovers from previous runs of THIS site only — matched by process
# working directory, never by bare port or script name, so other sites'
# previews and dev servers survive (multi-site collision, 2026-08-16).
# Note: zola serve still binds 1111, so two sites can't run dev.sh at once —
# but the failure is a visible "port in use" error, not a silent kill.
kill_mine() {
    for pid in $(pgrep -f "$1" 2>/dev/null); do
        { [ "$pid" = "$$" ] || [ "$pid" = "$PPID" ]; } && continue
        case "$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" in
            "$PWD"|"$PWD"/*) kill "$pid" 2>/dev/null || true ;;
        esac
    done
}
kill_mine "python3 -m http.server"
kill_mine "zola serve"
kill_mine "bash.*(dev|preview)\.sh"

/opt/homebrew/bin/python3 tools/prebuild.py

# Everything runs as a job; on ANY exit path — Ctrl-C, TERM, terminal
# closing, zola crashing — kill all jobs so nothing is left running.
# (Verified 2026-08-07 on scottwillsey: a plain foreground zola + EXIT trap
# orphans zola when the script is signaled directly rather than via the
# terminal's process group.)
cleanup() { kill $(jobs -p) 2>/dev/null; }
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT

# Poll content/, data/ and src/assets once a second; on any change, re-run
# prebuild (it takes well under a second). The stamp file lives outside the
# repo.
#
# prebuild writes into the very dirs this loop watches, so its own writes
# re-trigger it once — harmless, because write_if_changed means that second
# pass writes nothing, and the loop then goes idle (same reasoning as
# scottwillsey's dev.sh, 2026-10-25). The nudge below is what would make it
# spin (touching content/_index.md re-triggers the loop, which nudges
# again…), so it is tied to image changes only, never to the content/data
# changes prebuild itself produces.
stamp=$(mktemp)
(
  while sleep 1; do
    if [ -n "$(find content data src/assets -type f -newer "$stamp" -print -quit 2>/dev/null)" ]; then
      images_changed=$(find src/assets -type f -newer "$stamp" -print -quit 2>/dev/null)
      touch "$stamp"
      /opt/homebrew/bin/python3 tools/prebuild.py || echo "⚠ prebuild.py failed — fix the error above and save again"
      # Images referenced by resize_image / get_image_metadata live in
      # src/assets/images, which zola doesn't watch, so an image change gives
      # zola no file event. The pipeline also writes content BEFORE its
      # images finish landing (Retrobatch runs in command 2), so a failed
      # build would otherwise never retry. Nudge a rebuild. content/ and
      # data/ edits need no nudge: zola watches both (data via
      # --extra-watch-path below).
      if [ -n "$images_changed" ]; then
        touch content/_index.md
      fi
    fi
  done
) &

( sleep 2 && open "http://127.0.0.1:1111" ) &
# --extra-watch-path data: templates read data/*.json via load_data, which
# zola neither watches nor re-reads on unrelated rebuilds (observed
# 2026-08-07 on scottwillsey: serve cache kept pages stale after JSON
# changes). Watching data/ makes brews/reviews JSON changes trigger a real
# reload.
zola serve --extra-watch-path data "$@" &
wait $!
