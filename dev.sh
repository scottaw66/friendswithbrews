#!/bin/bash
# Preview/writing mode: one command, then just edit and save.
#
#   ./dev.sh   → http://127.0.0.1:1111 with live reload (opens browser)
#
# What it runs (all cleaned up on Ctrl-C):
#   - migrate/convert.py once up front, then again automatically whenever
#     anything in src/ (the authoring tree) changes — zola serve only
#     watches the generated content/, so this is what makes
#     "save → browser reloads" work for pipeline/content edits
#   - zola serve (foreground)
#
# /search works in dev (run ./preview.sh for a pagefind index first if you
# need results); /explore does NOT — its /api/search proxy only exists on
# production Apache (decided Phase 7; no local shim).

set -e
cd "$(dirname "$0")"

# Sweep leftovers from previous dev.sh/preview.sh runs (stale servers,
# watchers, orphaned instances) so starting fresh always works.
lsof -ti tcp:1111 -ti tcp:1818 2>/dev/null | xargs kill 2>/dev/null || true
for pid in $(pgrep -f "bash.*(dev|preview)\.sh" 2>/dev/null); do
    [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ] && kill "$pid" 2>/dev/null || true
done

python3 migrate/convert.py

# Everything runs as a job; on ANY exit path — Ctrl-C, TERM, terminal
# closing, zola crashing — kill all jobs so nothing is left running.
# (Verified 2026-08-07 on scottwillsey: a plain foreground zola + EXIT trap
# orphans zola when the script is signaled directly rather than via the
# terminal's process group.)
cleanup() { kill $(jobs -p) 2>/dev/null; }
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT

# Poll src/ once a second; on any change, re-run the converter (it takes
# well under a second). The stamp file lives outside the repo.
stamp=$(mktemp)
(
  while sleep 1; do
    if [ -n "$(find src -type f -newer "$stamp" -print -quit 2>/dev/null)" ]; then
      touch "$stamp"
      python3 migrate/convert.py || echo "⚠ convert.py failed — fix the error above and save again"
      # If the conversion changed no content files, zola gets no file event —
      # but the src/ change may still matter to it: images referenced by
      # resize_image / get_image_metadata live in src/, which zola doesn't
      # watch. The pipeline also writes content BEFORE its images finish
      # landing, so a failed build would otherwise never retry. Nudge a
      # rebuild.
      if [ -z "$(find content -name '*.md' -newer "$stamp" -print -quit 2>/dev/null)" ]; then
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
