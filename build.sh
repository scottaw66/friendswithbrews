#!/bin/bash
# Build friendswithbrews.com (no deploy — use deploy.sh for that).
#
# Pipeline: convert (authoring tree src/ → Zola content/+data/) →
# zola build → feed/sitemap postprocessing → Pagefind index.
# See ZOLA-MIGRATION.md.
#
# One-time setup on a fresh clone:
#   brew install zola
#   uv venv .venv && uv pip install --python .venv/bin/python "pagefind[extended]"

set -e
cd "$(dirname "$0")"

# A running `zola serve` FOR THIS SITE rebuilds dist/ on every file change
# (Zola 0.23 writes output_dir even in serve mode — diagnosed 2026-08-07 on
# the scottwillsey migration after "Directory not empty" delete races).
# Stop it before building (it used to refuse and exit; changed 2026-09-26 so
# build/deploy never block on it). Other sites' zola serve processes are
# harmless and left alone — matched by process cwd (multi-site collision,
# 2026-08-16).
for pid in $(pgrep -f "zola serve" 2>/dev/null); do
    if [ "$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" = "$PWD" ]; then
        echo "Stopping zola serve for this site (pid $pid)..."
        kill "$pid" 2>/dev/null || true
        # Wait up to ~5s for a clean exit, then force it.
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            kill -0 "$pid" 2>/dev/null || break
            sleep 0.5
        done
        kill -9 "$pid" 2>/dev/null || true
    fi
done
# Clear dist/ by renaming aside (atomic; .DS_Store/mdworker races can still
# make direct rm -rf flaky). Old trees are cleaned on the next run.
rm -rf .dist-trash-* 2>/dev/null || true
if [ -d dist ]; then mv dist ".dist-trash-$$"; fi

python3 migrate/convert.py
zola build --force
python3 migrate/postbuild.py
.venv/bin/python -m pagefind --site dist

echo "Build complete: dist/"
