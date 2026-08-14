#!/usr/bin/env python3
"""Post-build feed transforms — the Zola-era equivalent of the ultrahtml
step in the old Astro feed.xml.js (ported from the scottwillsey.com
migration's postbuild.py):

  1. Rewrite site-relative href/src in <content:encoded> to absolute URLs
     (feed readers can't resolve relative links; the old feed absolutized
     every one — dist-baseline/feed.xml has zero relative URLs).
  2. Drop <script>/<style> elements from item content (a no-op on current
     content — checked 2026-08-13 — but the old sanitize step did it, and
     future show notes shouldn't regress the feed).

<description> CDATA (descriptionRSS) is deliberately untouched: the Astro
pipeline passed it verbatim too — only content:encoded went through
ultrahtml.

Operates on the XML-escaped text inside <content:encoded> directly
(patterns are matched in their escaped form), so nothing is
unescaped/re-escaped.

Run after `zola build`:  python3 migrate/postbuild.py

Phase 8 will add the sitemap /explore/ strip here.
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BASE_URL = "https://friendswithbrews.com"
FEED = REPO / "dist" / "feed.xml"

CONTENT_RE = re.compile(r"(<content:encoded>)(.*?)(</content:encoded>)", re.S)
SCRIPT_RE = re.compile(r"&lt;script\b.*?&lt;/script&gt;", re.S | re.I)
STYLE_RE = re.compile(r"&lt;style\b.*?&lt;/style&gt;", re.S | re.I)


def fix_content(m: re.Match) -> str:
    inner = m.group(2)
    inner = SCRIPT_RE.sub("", inner)
    inner = STYLE_RE.sub("", inner)
    inner = inner.replace("href=&quot;/", f"href=&quot;{BASE_URL}/")
    inner = inner.replace("src=&quot;/", f"src=&quot;{BASE_URL}/")
    return m.group(1) + inner + m.group(3)


def main() -> int:
    if not FEED.exists():
        print(f"ERROR missing feed: {FEED}")
        return 1
    xml = FEED.read_text(encoding="utf-8")
    fixed = CONTENT_RE.sub(fix_content, xml)
    FEED.write_text(fixed, encoding="utf-8")
    print(f"postbuild.py: {fixed.count('<item>')} feed items processed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
