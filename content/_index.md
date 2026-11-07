+++
# Root section. Episode pages live directly in content/ with numeric slugs so
# their URLs stay /N/. Episode pages are the source (written by the
# episode pipeline or by hand); tools/prebuild.py only refreshes their derived
# [extra] fields. This file is hand-maintained — prebuild never touches any
# _index.md.
sort_by = "date"
page_template = "episode.html"
# Podcast feed at /feed.xml (episodes only — site-wide generate_feeds stays
# off so transcripts/stubs don't leak in). templates/feed.xml matches the
# old @astrojs/rss output; tools/postbuild.py absolutizes item content.
generate_feeds = true
+++
