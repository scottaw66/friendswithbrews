#!/usr/bin/env python3
"""Parity checks: dist/ (Zola) vs dist-baseline/ (frozen Astro build).

    migrate/parity.py urls            URL-set diff (pages + root files)
    migrate/parity.py page /101/      text + link/img diff for one page
    migrate/parity.py pages           text + link diff for every common page

Page mode compares what a reader/crawler sees — visible text tokens, href
targets, and img sources — not raw bytes: Astro output carries hashed
data-astro-cid-* attributes and bundler asset paths that legitimately
differ. Known-legit differences are normalized below.
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "dist-baseline"
DIST = ROOT / "dist"

SKIP_TAGS = {"script", "style", "symbol"}


class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text: list[str] = []
        self.links: list[str] = []
        self.imgs: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip += 1
        d = dict(attrs)
        if tag == "a" and d.get("href"):
            self.links.append(d["href"])
        if tag in ("img", "source") and (d.get("src") or d.get("srcset")):
            self.imgs.append(d.get("src") or d.get("srcset"))

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.text.extend(data.split())


def normalize_link(href: str) -> str:
    return href


def normalize_img(src: str) -> str:
    # Hashed pipeline outputs: Astro /_astro/name.HASH_HASH.webp vs Zola
    # /processed_images/name.HASH.webp — compare by basename + extension.
    m = re.match(r"/(?:_astro|processed_images)/([a-zA-Z0-9_-]+)\.[\w.]*\.?(\w+)$", src)
    if m:
        return f"optimized:{m.group(1).lower()}.{m.group(2)}"
    return src


def extract(path: Path) -> Extract:
    e = Extract()
    e.feed(path.read_text(encoding="utf-8"))
    return e


def diff_lists(label: str, a: list, b: list, url: str) -> int:
    if a == b:
        return 0
    print(f"--- {url}: {label} differ")
    sa, sb = set(a), set(b)
    for x in [x for x in a if x not in sb][:10]:
        print(f"    baseline only: {x!r}")
    for x in [x for x in b if x not in sa][:10]:
        print(f"    zola only:     {x!r}")
    if sa == sb:
        print("    (same set, different order/multiplicity)")
    return 1


def check_page(rel: str, quiet: bool = False) -> int:
    rel = rel.strip("/")
    b = BASELINE / rel / "index.html" if rel else BASELINE / "index.html"
    z = DIST / rel / "index.html" if rel else DIST / "index.html"
    if not b.exists() or not z.exists():
        print(f"--- /{rel}/: missing ({'baseline' if not b.exists() else 'zola'})")
        return 1
    eb, ez = extract(b), extract(z)
    bad = 0
    bad += diff_lists("text", eb.text, ez.text, f"/{rel}/")
    bad += diff_lists("links", [normalize_link(x) for x in eb.links],
                      [normalize_link(x) for x in ez.links], f"/{rel}/")
    bad += diff_lists("images", [normalize_img(x) for x in eb.imgs],
                      [normalize_img(x) for x in ez.imgs], f"/{rel}/")
    if not bad and not quiet:
        print(f"OK /{rel}/")
    return bad


def all_pages() -> list[str]:
    return sorted(
        str(p.parent.relative_to(BASELINE))
        for p in BASELINE.rglob("index.html")
    )


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else "urls"
    if mode == "urls":
        def urlset(d: Path) -> set:
            urls = {f"/{p.parent.relative_to(d)}/" for p in d.rglob("index.html")}
            urls |= {f"/{p.name}" for p in d.glob("*") if p.is_file()
                     and p.name not in (".DS_Store", "index.html")}
            return urls
        b, z = urlset(BASELINE), urlset(DIST)
        for u in sorted(b - z):
            print(f"baseline only: {u}")
        for u in sorted(z - b):
            print(f"zola only:     {u}")
        return 0 if b == z else 1
    if mode == "page":
        return 1 if check_page(sys.argv[2]) else 0
    if mode == "pages":
        bad = sum(check_page(rel, quiet=True) for rel in all_pages()
                  if (DIST / rel / "index.html").exists())
        print(f"pages mode: {bad} page(s) with differences")
        return 1 if bad else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
