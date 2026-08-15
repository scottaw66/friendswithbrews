#!/bin/bash
# Build and deploy friendswithbrews.com to production.
# The deploy step is the same rsync script the Astro site used
# (it mirrors dist/ to the server and ships the vector-search DB).

set -e
cd "$(dirname "$0")"

./build.sh
~/Scripts/Sites/fwb/deploy.sh
