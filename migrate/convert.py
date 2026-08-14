#!/usr/bin/env python3
"""Regenerate Zola's content/ and data/ from the authoring tree.

Permanent build step 1 — NOT a one-off migration script. Authoring stays in
src/content/ (YAML-frontmatter markdown, written by the external pipeline in
~/Scripts/Sites/fwb/) and src/data/ (JSON). This script converts that tree
into Zola-shaped content on every build. Zero dependencies on purpose: it
must run with the system python3, forever.

Ownership rule: this script owns — and prunes stale files from — exactly
what it generates:

    content/<n>.md              episode pages         (URL /<n>/)
    content/transcripts/<n>.md  transcript pages      (URL /transcripts/<n>/)
    content/listpages/*.md      pagination stubs      (/episodes/N, /brews/N,
                                                       /transcripts/page/N)
    content/bottle/<id>.md      brew detail stubs     (URL /bottle/<id>/)
    data/brews.json             copied from src/data/ for load_data()
    data/reviews.json           copied from src/data/ for load_data()
    data/site.json              copied from src/data/ for load_data()
                                (Tera components can't see `config`)

It never touches any _index.md or anything under content/pages/ — those are
hand-maintained.

Validation replaces the old Astro Zod schemas (src/content.config.ts, frozen
under astro/): any schema violation prints an error and exits non-zero,
which fails the build.
"""

import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
SRC_EPISODES = ROOT / "src/content/episodes"
SRC_TRANSCRIPTS = ROOT / "src/content/transcripts"
SRC_DATA = ROOT / "src/data"
OUT_CONTENT = ROOT / "content"
OUT_TRANSCRIPTS = OUT_CONTENT / "transcripts"
OUT_LISTPAGES = OUT_CONTENT / "listpages"
OUT_BOTTLE = OUT_CONTENT / "bottle"
OUT_DATA = ROOT / "data"

# Pagination sizes — must match [extra] in zola.toml (templates slice with
# the same values; the stub count is baked here).
EPISODES_PER_PAGE = 5
TRANSCRIPTS_PER_PAGE = 20
BREWS_PER_PAGE = 12

LA = ZoneInfo("America/Los_Angeles")

# English day/month names hardcoded instead of strftime %A/%b so output can
# never depend on the running locale (parity with date-fns enUS).
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

errors: list[str] = []
warnings: list[str] = []
stats = {"written": 0, "unchanged": 0, "pruned": 0}


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


# --------------------------------------------------------------------------
# Frontmatter parsing (YAML subset)
#
# The authoring frontmatter is machine-generated (fwb-new-episode/main.py,
# fwb-transcript/main.py) and consists solely of top-level `key: value`
# scalars. Values are either bare (episode number, HH:MM:SS length) or
# double-quoted with JSON-style escaping (the generator uses json.dumps, and
# descriptionRSS escapes quotes as \"). Multi-line quoted scalars continue on
# lines indented two spaces (valid YAML as of the 2026-08-10 back-catalog
# rewrite); folding a line break yields a single space, matching js-yaml.
# --------------------------------------------------------------------------

KEY_RE = re.compile(r"^([A-Za-z][A-Za-z0-9_]*):(?:\s(.*))?$")


def _closes_quote(fragment: str) -> bool:
    """True if a fragment that is inside a double-quoted scalar ends it."""
    if not fragment.endswith('"'):
        return False
    backslashes = 0
    for ch in reversed(fragment[:-1]):
        if ch == "\\":
            backslashes += 1
        else:
            break
    return backslashes % 2 == 0


def _unquote(raw: str, name: str, key: str) -> str:
    """Decode a complete double-quoted scalar. JSON escaping is a near-subset
    of YAML's; the one YAML-only escape in real data is backslash-space
    (episode 44's "Anthropic \\ Introducing Claude" link text), which YAML —
    and js-yaml, per the baseline feed bytes — folds to a plain space."""
    raw = re.sub(r"(?<!\\)((?:\\\\)*)\\ ", r"\1 ", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        err(f"{name}: cannot decode quoted value for {key!r}: {e}")
        return ""


def parse_frontmatter(text: str, name: str) -> tuple[dict, str]:
    lines = text.split("\n")
    # Frontmatter lines are rstripped (transcript 60 has editor-added
    # trailing spaces on every frontmatter line); the body is left untouched
    # since trailing double-spaces are meaningful markdown there.
    if not lines or lines[0].rstrip() != "---":
        err(f"{name}: missing opening '---'")
        return {}, text
    try:
        close = next(i for i in range(1, len(lines)) if lines[i].rstrip() == "---")
    except StopIteration:
        err(f"{name}: missing closing '---'")
        return {}, text
    fm_lines = [l.rstrip() for l in lines[1:close]]
    body = "\n".join(lines[close + 1:])

    data: dict[str, object] = {}
    i = 0
    while i < len(fm_lines):
        line = fm_lines[i]
        m = KEY_RE.match(line)
        if not m:
            err(f"{name}: unparseable frontmatter line {i + 2}: {line!r}")
            i += 1
            continue
        key, val = m.group(1), m.group(2) or ""
        if key in data:
            err(f"{name}: duplicate frontmatter key {key!r}")
        if val.startswith('"'):
            if len(val) > 1 and _closes_quote(val[1:]):
                data[key] = _unquote(val, name, key)
            else:
                parts = [val]
                closed = False
                i += 1
                while i < len(fm_lines):
                    cont = fm_lines[i]
                    if not cont.strip():
                        err(f"{name}: empty continuation line {i + 2} in "
                            f"{key!r} (would fold to a newline — unsupported)")
                        i += 1
                        continue
                    if not cont.startswith("  "):
                        err(f"{name}: unindented continuation line {i + 2} "
                            f"in {key!r} (invalid YAML)")
                    parts.append(cont.strip())
                    if _closes_quote(cont.strip()):
                        closed = True
                        break
                    i += 1
                if not closed:
                    err(f"{name}: unterminated quoted value for {key!r}")
                data[key] = _unquote(" ".join(parts), name, key)
        else:
            data[key] = val.strip()
        i += 1
    return data, body


# --------------------------------------------------------------------------
# Validation (replaces the Zod schemas in astro/…/content.config.ts)
# --------------------------------------------------------------------------

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")
LENGTH_RE = re.compile(r"^\d{2}:\d{2}:\d{2}$")
YOUTUBE_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

EPISODE_KEYS = {"title", "description", "descriptionRSS", "episode", "date",
                "audioFile", "length", "bytes", "youtube", "id"}
EPISODE_REQUIRED = {"title", "description", "episode", "date", "audioFile",
                    "length", "bytes"}
# Transcripts are "episode frontmatter minus descriptionRSS"; bytes optional
# (matches the old Zod schema), youtube/id tolerated passthrough.
TRANSCRIPT_KEYS = EPISODE_KEYS - {"descriptionRSS"}
TRANSCRIPT_REQUIRED = EPISODE_REQUIRED - {"bytes"}


def validate(name: str, data: dict, known: set, required: set, stem: str) -> bool:
    ok = True
    for key in data:
        if key not in known:
            err(f"{name}: unknown frontmatter key {key!r}")
            ok = False
    for key in required:
        if not str(data.get(key, "")).strip():
            err(f"{name}: missing required key {key!r}")
            ok = False
    if not ok:
        return False
    if str(data["episode"]) != stem:
        err(f"{name}: episode {data['episode']!r} does not match filename")
        ok = False
    # Old transcripts (1–47) use the historical id form "T<n>".
    if "id" in data and str(data["id"]) not in (stem, f"T{stem}"):
        err(f"{name}: id {data['id']!r} does not match filename")
        ok = False
    if not DATE_RE.match(str(data["date"])):
        err(f"{name}: date {data['date']!r} is not ISO-8601 with offset")
        ok = False
    if not LENGTH_RE.match(str(data["length"])):
        err(f"{name}: length {data['length']!r} is not HH:MM:SS")
        ok = False
    if "bytes" in data and not str(data["bytes"]).isdigit():
        err(f"{name}: bytes {data['bytes']!r} is not numeric")
        ok = False
    if data.get("youtube") and not YOUTUBE_RE.match(str(data["youtube"])):
        err(f"{name}: youtube {data['youtube']!r} is not an 11-char video id")
        ok = False
    return ok


# --------------------------------------------------------------------------
# Date / display precomputation (ports of the frozen Astro utilities —
# astro/../DateFormat.mjs and episodelength.mjs — because Tera v2's date
# filter can't parse ISO-8601 and its formatting differs from date-fns)
# --------------------------------------------------------------------------

def rfc2822_date(dt: datetime) -> str:
    """UTC-rendered RFC-1123, byte-matching @astrojs/rss (JS toUTCString)."""
    u = dt.astimezone(timezone.utc)
    return (f"{DAYS[u.weekday()][:3]}, {u.day:02d} {MONTHS[u.month - 1]} "
            f"{u.year} {u.hour:02d}:{u.minute:02d}:{u.second:02d} GMT")


def display_date(dt: datetime) -> str:
    """date-fns 'eeee, dd MMM yyyy' in America/Los_Angeles (build-machine TZ
    under Astro; pinned here so builds are location-independent)."""
    l = dt.astimezone(LA)
    return f"{DAYS[l.weekday()]}, {l.day:02d} {MONTHS[l.month - 1]} {l.year}"


def episode_length(length: str) -> str:
    """Line-by-line port of episodelength.mjs episodeLength()."""
    hours, minutes = length.split(":")[0], length.split(":")[1]
    display = ""
    if int(hours) > 0:
        display = hours + " hour" + ("s" if int(hours) > 1 else "") + " "
    display += minutes + " minutes"
    return re.sub(r"^0", "", display, count=1)


# --------------------------------------------------------------------------
# Body transform
# --------------------------------------------------------------------------

RAW_TOKENS = ("{{", "{%", "{#")

# GFM autolinked bare URLs (remark); CommonMark/pulldown-cmark doesn't.
# Wrap them in <…> autolinks, which render identically. The lookbehind
# excludes URLs that are already markdown link targets `](…`, link text
# `[…`, autolinks `<…`, or inside quoted HTML attributes. (Only episode
# 100 has genuinely bare URLs today; the guard is for future show notes.)
BARE_URL_RE = re.compile(r"(?<![(\[<\"'])(https?://[^\s)\]<>\"']+)")

# GFM's extended autolink also linked scheme-less `www.` domains (always
# with an http:// prefix), matching after any non-alphanumeric — so the
# literal `<www.…>` spans in transcripts 13/84 got linked with the angle
# brackets left as text. pulldown-cmark has no www-autolink and `<www.…>`
# is not a CommonMark autolink (no scheme), so emit an explicit markdown
# link. The lookbehind keeps `https://www.` (already handled above) and
# mid-word runs like "Awwww." unmatched.
WWW_URL_RE = re.compile(r"(?<![\w/@.])(www\.[^\s)\]<>\"']+)")


def _www_link(m: re.Match) -> str:
    # GFM excludes trailing punctuation from the link target.
    url = m.group(1).rstrip(".,;:!?")
    tail = m.group(1)[len(url):]
    return f"[{url}](http://{url}){tail}"


# Nine episodes (8, 30, 40, 42, 43, 54, 60, 63, 64) inline images via
# relative ../../assets/images/… paths that astro:assets used to resolve
# into optimized /_astro/ URLs. Zola passes them through verbatim (broken
# on the page AND in the feed), so point them at the full-size copies in
# static/images/ — every referenced file exists there (checked 2026-08-13).
# descriptionRSS is NOT rewritten: the old feed carried its relative srcs
# verbatim, and it's kept byte-identical (see ZOLA-MIGRATION.md).
def rewrite_asset_images(body: str) -> str:
    return body.replace("../../assets/images/", "/images/")


def autolink_bare_urls(body: str) -> str:
    out = []
    in_fence = False
    for line in body.split("\n"):
        if line.strip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if not in_fence:
            line = BARE_URL_RE.sub(r"<\1>", line)
            line = WWW_URL_RE.sub(_www_link, line)
        out.append(line)
    return "\n".join(out)


def protect_tera(body: str, name: str) -> str:
    """Zola 0.23 treats content files as Tera templates: literal {{ / {% / {#
    anywhere in the body (including code fences) is evaluated or errors.
    Wrap any line containing them in {% raw %}…{% endraw %}."""
    if not any(t in body for t in RAW_TOKENS):
        return body
    out = []
    for line in body.split("\n"):
        if any(t in line for t in RAW_TOKENS):
            if "endraw" in line:
                err(f"{name}: line contains literal endraw tag — cannot "
                    f"auto-protect: {line!r}")
            out.append("{% raw %}" + line + "{% endraw %}")
        else:
            out.append(line)
    return "\n".join(out)


# --------------------------------------------------------------------------
# Output helpers
# --------------------------------------------------------------------------

def tstr(s: str) -> str:
    """TOML basic string. JSON string syntax is a subset of TOML's escaping
    (json.dumps never emits the \\/ escape and escapes all control chars)."""
    return json.dumps(str(s), ensure_ascii=False)


def write_if_changed(path: Path, content: str) -> None:
    """Skip byte-identical writes — mass rewrites fire hundreds of file
    events and wedge `zola serve` (learned on scottwillsey, commit 0efc5a5)."""
    if path.exists() and path.read_text(encoding="utf-8") == content:
        stats["unchanged"] += 1
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    stats["written"] += 1


def prune_stale(directory: Path, pattern: str, keep: set[str]) -> None:
    for path in directory.glob(pattern):
        if path.name in keep or path.name == "_index.md":
            continue
        path.unlink()
        stats["pruned"] += 1
        print(f"pruned stale {path.relative_to(ROOT)}")


# --------------------------------------------------------------------------
# Episodes → content/<n>.md
# --------------------------------------------------------------------------

def convert_episodes(transcript_stems: set[str]) -> dict[str, str]:
    """Returns {episode number: title} for the bottle stubs."""
    titles: dict[str, str] = {}
    generated: set[str] = set()
    for path in sorted(SRC_EPISODES.glob("*.md"), key=lambda p: int(p.stem)):
        name = f"episodes/{path.name}"
        data, body = parse_frontmatter(path.read_text(encoding="utf-8"), name)
        if not validate(name, data, EPISODE_KEYS, EPISODE_REQUIRED, path.stem):
            continue
        n = path.stem
        dt = datetime.fromisoformat(str(data["date"]))
        titles[n] = str(data["title"])

        fm = [
            "+++",
            f"title = {tstr(data['title'])}",
            f"description = {tstr(data['description'])}",
            f"date = {data['date']}",
            f'slug = "{n}"',
            "",
            "[extra]",
            f"episode = {n}",
            f"audio_file = {tstr(data['audioFile'])}",
            f'length = "{data["length"]}"',
            f"bytes = {tstr(data['bytes'])}",
            f"duration = {tstr(episode_length(str(data['length'])))}",
            f"display_date = {tstr(display_date(dt))}",
            f"rfc2822_date = {tstr(rfc2822_date(dt))}",
            f"has_transcript = {'true' if n in transcript_stems else 'false'}",
        ]
        if data.get("youtube"):
            fm.append(f"youtube = {tstr(data['youtube'])}")
        if data.get("descriptionRSS"):
            fm.append(f"description_rss = {tstr(data['descriptionRSS'])}")
        fm.append("+++")

        out = "\n".join(fm) + "\n" + protect_tera(
            autolink_bare_urls(rewrite_asset_images(body)), name)
        write_if_changed(OUT_CONTENT / path.name, out)
        generated.add(path.name)
    prune_stale(OUT_CONTENT, "[0-9]*.md", generated)
    return titles


# --------------------------------------------------------------------------
# Transcripts → content/transcripts/<n>.md
# --------------------------------------------------------------------------

def convert_transcripts() -> set[str]:
    generated: set[str] = set()
    for path in sorted(SRC_TRANSCRIPTS.glob("*.md"), key=lambda p: int(p.stem)):
        name = f"transcripts/{path.name}"
        data, body = parse_frontmatter(path.read_text(encoding="utf-8"), name)
        if not validate(name, data, TRANSCRIPT_KEYS, TRANSCRIPT_REQUIRED, path.stem):
            continue
        n = path.stem
        dt = datetime.fromisoformat(str(data["date"]))

        fm = [
            "+++",
            f"title = {tstr(data['title'])}",
            f"description = {tstr(data['description'])}",
            f"date = {data['date']}",
            f'slug = "{n}"',
            "",
            "[extra]",
            f"episode = {n}",
            f"audio_file = {tstr(data['audioFile'])}",
            f'length = "{data["length"]}"',
            f"display_date = {tstr(display_date(dt))}",
        ]
        if data.get("bytes"):
            fm.append(f"bytes = {tstr(data['bytes'])}")
        if data.get("youtube"):
            fm.append(f"youtube = {tstr(data['youtube'])}")
        fm.append("+++")

        out = "\n".join(fm) + "\n" + protect_tera(
            autolink_bare_urls(rewrite_asset_images(body)), name)
        write_if_changed(OUT_TRANSCRIPTS / path.name, out)
        generated.add(path.name)
    prune_stale(OUT_TRANSCRIPTS, "*.md", generated)
    return {Path(g).stem for g in generated}


# --------------------------------------------------------------------------
# Pagination stubs → content/listpages/*.md
#
# Zola's paginator can't express these URL shapes with content that lives
# elsewhere, so each list page is a stub with a `path` override; the
# template slices the real data itself (scottwillsey pattern).
# --------------------------------------------------------------------------

def write_list_stubs(episode_count: int, transcript_count: int,
                     brew_count: int) -> None:
    generated: set[str] = set()

    def stub(filename: str, title: str, url_path: str, template: str,
             page_num: int, aliases: list[str] | None = None) -> None:
        fm = [
            "+++",
            f"title = {tstr(title)}",
            f'path = "{url_path}"',
            f'template = "{template}"',
        ]
        if aliases:
            fm.append(f"aliases = {json.dumps(aliases)}")
        fm += ["", "[extra]", f"page_num = {page_num}", "+++", ""]
        write_if_changed(OUT_LISTPAGES / filename, "\n".join(fm))
        generated.add(filename)

    for k in range(1, math.ceil(episode_count / EPISODES_PER_PAGE) + 1):
        stub(f"episodes-{k}.md", f"Episodes page {k}", f"episodes/{k}",
             "episodelist.html", k)
    for k in range(1, math.ceil(brew_count / BREWS_PER_PAGE) + 1):
        stub(f"brews-{k}.md", f"Brews page {k}", f"brews/{k}",
             "brewlist.html", k)
    for k in range(1, math.ceil(transcript_count / TRANSCRIPTS_PER_PAGE) + 1):
        # Page 1 also owns /transcripts/ (the Astro config redirect).
        stub(f"transcripts-{k}.md", f"Transcripts page {k}",
             f"transcripts/page/{k}", "transcriptlist.html", k,
             aliases=["/transcripts"] if k == 1 else None)

    prune_stale(OUT_LISTPAGES, "*.md", generated)


# --------------------------------------------------------------------------
# Brews → content/bottle/<id>.md stubs + data/*.json
# --------------------------------------------------------------------------

VALID_BREW_TYPES = {"beer", "coffee", "tea", "water"}
VALID_VOTES = {"thumbs-up", "thumbs-down", "side-thumb"}


def _url_hostname(url: str) -> str:
    """new URL(url).hostname: lowercased host, no port."""
    try:
        return (urlsplit(str(url)).hostname or "").lower()
    except ValueError:
        return ""


def _url_origin(url: str) -> str:
    """new URL(url).origin: scheme://host, keeping only an explicit port.

    (JS drops the scheme's default port; brews.json URLs never carry one, so
    an explicit port passing through verbatim is close enough.)"""
    try:
        parts = urlsplit(str(url))
    except ValueError:
        return ""
    host = (parts.hostname or "").lower()
    if not parts.scheme or not host:
        return ""
    port = f":{parts.port}" if parts.port else ""
    return f"{parts.scheme}://{host}{port}"


def convert_brews(episode_titles: dict[str, str]) -> int:
    src = SRC_DATA / "brews.json"
    brews = json.loads(src.read_text(encoding="utf-8"))
    if not isinstance(brews, list):
        err("brews.json: not a JSON array")
        return 0

    generated: set[str] = set()
    for i, brew in enumerate(brews):
        name = f"brews.json[{i}]"
        bid = str(brew.get("id", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]+", bid):
            err(f"{name}: bad or missing id {bid!r}")
            continue
        if brew.get("type") not in VALID_BREW_TYPES:
            err(f"{name} ({bid}): bad type {brew.get('type')!r}")
        for field in ("name", "brewery", "image", "url"):
            if not str(brew.get(field, "")).strip():
                err(f"{name} ({bid}): missing {field!r}")
        # Empty description exists in real data (Mud Season) and the old
        # site rendered it as an empty quote — tolerate with a warning.
        if not str(brew.get("description", "")).strip():
            warn(f"{name} ({bid}): empty description")
        image = SRC_EPISODES.parent.parent / "assets/images/brews" / f"{brew.get('image')}.png"
        if not image.exists():
            err(f"{name} ({bid}): image not found: {image.relative_to(ROOT)}")

        fm = [
            "+++",
            f"title = {tstr(brew.get('name', ''))}",
            f'path = "bottle/{bid}"',
            'template = "bottle.html"',
            "",
            "[extra]",
            f"brewery = {tstr(brew.get('brewery', ''))}",
            f"image = {tstr(brew.get('image', ''))}",
            f"brew_description = {tstr(brew.get('description', ''))}",
            f"brew_type = {tstr(brew.get('type', ''))}",
            f"url = {tstr(brew.get('url', ''))}",
            # bottle.html's "<name> on <hostname>" line — Tera can't parse
            # URLs, so mirror JS's new URL(url).hostname/.origin here.
            f"url_hostname = {tstr(_url_hostname(brew.get('url', '')))}",
            f"url_origin = {tstr(_url_origin(brew.get('url', '')))}",
            f"episodes = {json.dumps([str(e) for e in brew.get('episodes', [])])}",
            "",
            "[extra.episode_titles]",
        ]
        for ep in brew.get("episodes", []):
            title = episode_titles.get(str(ep))
            if title is None:
                err(f"{name} ({bid}): references unknown episode {ep!r}")
                title = str(ep)
            fm.append(f"{tstr(ep)} = {tstr(title)}")
        for r in brew.get("rating", []):
            if r.get("vote") not in VALID_VOTES:
                err(f"{name} ({bid}): bad vote {r.get('vote')!r}")
            fm += [
                "",
                "[[extra.rating]]",
                f"host = {tstr(r.get('host', ''))}",
                f"vote = {tstr(r.get('vote', ''))}",
                f"description = {tstr(r.get('description', ''))}",
            ]
        fm += ["+++", ""]
        write_if_changed(OUT_BOTTLE / f"{bid}.md", "\n".join(fm))
        generated.add(f"{bid}.md")

    prune_stale(OUT_BOTTLE, "*.md", generated)
    return len(brews)


def copy_data() -> None:
    # site.json is included because Tera v2 components can't see `config` —
    # podcast_links reads audio_prefix/social URLs via load_data instead.
    keep = set()
    for filename in ("brews.json", "reviews.json", "site.json"):
        content = (SRC_DATA / filename).read_text(encoding="utf-8")
        write_if_changed(OUT_DATA / filename, content)
        keep.add(filename)
    prune_stale(OUT_DATA, "*.json", keep)


# --------------------------------------------------------------------------

def main() -> int:
    transcript_stems = {p.stem for p in SRC_TRANSCRIPTS.glob("*.md")}
    episode_titles = convert_episodes(transcript_stems)
    converted_transcripts = convert_transcripts()
    brew_count = convert_brews(episode_titles)
    write_list_stubs(len(episode_titles), len(converted_transcripts), brew_count)
    copy_data()

    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        print(f"\nconvert.py: {len(errors)} error(s) — failing the build.",
              file=sys.stderr)
        return 1
    print(f"convert.py: {len(episode_titles)} episodes, "
          f"{len(converted_transcripts)} transcripts, {brew_count} brews | "
          f"{stats['written']} written, {stats['unchanged']} unchanged, "
          f"{stats['pruned']} pruned")
    return 0


if __name__ == "__main__":
    sys.exit(main())
