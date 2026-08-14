#!/usr/bin/env python3
"""Parity checks: dist/ (Zola) vs dist-baseline/ (frozen Astro build).

    migrate/parity.py urls            URL-set diff (pages + root files)
    migrate/parity.py page /101/      text + link/img diff for one page
    migrate/parity.py pages           text + link diff for every common page
    migrate/parity.py feed            field-by-field podcast feed diff

Page mode compares what a reader/crawler sees — visible text tokens, href
targets, and img sources — not raw bytes: Astro output carries hashed
data-astro-cid-* attributes and bundler asset paths that legitimately
differ. Known-legit differences are normalized below.

Feed mode parses both feeds and diffs the channel plus every field of
every item. Metadata must match exactly; description/content:encoded
bodies are compared whitespace-insensitively (the XML parser already
makes CDATA-vs-entity-escaping equivalent). Run AFTER postbuild.py —
absolutization is part of the published feed.
"""

import re
import sys
import xml.etree.ElementTree as ET
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
        if tag in ("img", "source"):
            # One entry per URL: src alone, and each srcset candidate as
            # "url <width-descriptor>" so widths are part of the parity.
            if d.get("src"):
                self.imgs.append(d["src"])
            for part in (d.get("srcset") or "").split(","):
                bits = part.split()
                if bits:
                    self.imgs.append(" ".join(bits[:2]))

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.text.extend(data.split())


def normalize_link(href: str) -> str:
    return href


def normalize_img(src: str) -> str | None:
    # Hashed pipeline outputs: Astro /_astro/name.HASH_HASH.webp vs Zola
    # /processed_images/name.HASH.webp — compare by basename + extension
    # (+ srcset width descriptor when present). Phase 5 accepted
    # divergences, folded in here:
    #   - avif variants are intentionally dropped (Zola can't encode
    #     avif) -> baseline avif entries are excluded (return None);
    #   - the <img> fallback changed format png->jpg (Astro emitted a
    #     jpeg <source> ahead of the png fallback, so browsers got jpg
    #     either way) -> png/jpeg normalize to jpg for optimized assets.
    url, _, desc = src.partition(" ")
    m = re.match(r"/(?:_astro|processed_images)/([^/]+)$", url)
    if not m:
        return src
    # name.HASH(.HASH).ext — basename is the first dot-token, ext the last.
    toks = m.group(1).split(".")
    ext = toks[-1].lower()
    if ext == "avif":
        return None
    if ext in ("png", "jpeg"):
        ext = "jpg"
    return f"optimized:{toks[0].lower()}.{ext} {desc}".strip()


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
    # Set compare, not list: dropping the jpeg <source> (its URLs now
    # live only in the <img> srcset, where the baseline duplicated them)
    # legitimately changes per-URL multiplicity but not coverage.
    bad += diff_lists("images",
                      sorted({n for n in map(normalize_img, eb.imgs) if n}),
                      sorted({n for n in map(normalize_img, ez.imgs) if n}),
                      f"/{rel}/")
    if not bad and not quiet:
        print(f"OK /{rel}/")
    return bad


# description: whitespace-insensitive string compare (descriptionRSS is
# carried verbatim, so it should match modulo whitespace). content:encoded:
# rendered-markdown HTML whose markup legitimately differs (br/self-closing
# forms, astro:assets' loading/width attrs and /_astro/ webp URLs vs our
# /processed_images/ webp URLs) — compared as extracted text tokens + link
# targets + stem-normalized img sources, same philosophy as page mode.
LOOSE_TEXT_TAGS = {"description"}
HTML_TEXT_TAGS = {"{http://purl.org/rss/1.0/modules/content/}encoded"}


def _feed_img_stem(src: str) -> str:
    src = (src or "").split()[0]
    src = re.sub(r"^https?://friendswithbrews\.com", "", src)
    m = re.match(r"^/(?:_astro|processed_images)/(.+?)\.[^.]+\.\w+$", src)
    if m:
        return m.group(1).lower()
    m = re.match(r"^/images/(?:[\w-]+/)*(.+?)\.\w+$", src)
    if m:
        return m.group(1).lower()
    return src


def _html_facets(s: str) -> tuple[list, list, list]:
    e = Extract()
    e.feed(s or "")
    return e.text, e.links, [_feed_img_stem(u) for u in e.imgs]


def _tagname(el: ET.Element) -> str:
    return re.sub(r"\{[^}]*\}", lambda m: m.group(0).strip("{}").rsplit("/", 1)[-1] + ":",
                  el.tag)


def _norm(text: str | None, loose: bool) -> str:
    text = text or ""
    return re.sub(r"\s+", " ", text).strip() if loose else text


def _diff_element(a: ET.Element, b: ET.Element, path: str, out: list[str]) -> None:
    if a.tag != b.tag:
        out.append(f"{path}: tag {_tagname(a)!r} vs {_tagname(b)!r}")
        return
    here = f"{path}/{_tagname(a)}"
    if a.attrib != b.attrib:
        out.append(f"{here}: attrs {a.attrib!r} vs {b.attrib!r}")
    if a.tag in HTML_TEXT_TAGS:
        fa, fb = _html_facets(a.text), _html_facets(b.text)
        for label, xa, xb in zip(("text", "links", "imgs"), fa, fb):
            if xa != xb:
                only_a = [x for x in xa if x not in xb][:5]
                only_b = [x for x in xb if x not in xa][:5]
                out.append(f"{here}: {label} differ "
                           f"(baseline only {only_a!r}, zola only {only_b!r})")
        return
    loose = a.tag in LOOSE_TEXT_TAGS
    ta, tb = _norm(a.text, loose), _norm(b.text, loose)
    if ta != tb:
        preview = f"{ta[:120]!r} vs {tb[:120]!r}" if len(ta) + len(tb) < 300 else \
            "long text differs (first divergence at index " + \
            str(next((i for i, (x, y) in enumerate(zip(ta, tb)) if x != y),
                     min(len(ta), len(tb)))) + ")"
        out.append(f"{here}: text {preview}")
    if len(a) != len(b):
        out.append(f"{here}: child count {len(a)} vs {len(b)} "
                   f"({[_tagname(c) for c in a]} vs {[_tagname(c) for c in b]})")
        return
    for ca, cb in zip(a, b):
        _diff_element(ca, cb, here, out)


def check_feed() -> int:
    b_path, z_path = BASELINE / "feed.xml", DIST / "feed.xml"
    for p in (b_path, z_path):
        if not p.exists():
            print(f"missing: {p}")
            return 1
    b = ET.parse(b_path).getroot().find("channel")
    z = ET.parse(z_path).getroot().find("channel")
    b_items = b.findall("item")
    z_items = z.findall("item")
    problems: list[str] = []

    # Channel scalars: everything that isn't an <item>, in document order.
    b_chan = [el for el in b if el.tag != "item"]
    z_chan = [el for el in z if el.tag != "item"]
    if [e.tag for e in b_chan] != [e.tag for e in z_chan]:
        problems.append(f"channel element order: {[_tagname(e) for e in b_chan]} "
                        f"vs {[_tagname(e) for e in z_chan]}")
    else:
        for ca, cb in zip(b_chan, z_chan):
            _diff_element(ca, cb, "channel", problems)

    if len(b_items) != len(z_items):
        problems.append(f"item count: {len(b_items)} vs {len(z_items)}")
    for i, (ia, ib) in enumerate(zip(b_items, z_items)):
        before = len(problems)
        _diff_element(ia, ib, f"item[{i}]", problems)
        if len(problems) > before:
            guid = ia.findtext("guid", "?")
            problems.insert(before, f"--- item {i} ({guid}):")

    for line in problems:
        print(line)
    n = sum(1 for p in problems if not p.startswith("---"))
    print(f"feed mode: {len(b_items)} baseline / {len(z_items)} zola items, "
          f"{n} field mismatch(es)")
    return 1 if n else 0


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
    if mode == "feed":
        return check_feed()
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
