# Friends with Brews → Zola Migration Plan

Written 2026-08-10, before any migration work. Modeled directly on the
scottwillsey.com migration (see `~/Sites/scottwillsey/ZOLA-MIGRATION.md`,
completed 2026-08-07/08), reusing its architecture, tooling, and parity
methodology. Target: **Zola 0.23.x** (same version constraints and gotchas
apply — Tera v2 components, no shortcodes, content files are Tera templates).

---

## Ground rules (same as scottwillsey, adapted)

1. **Every public URL survives unchanged.** The full URL inventory:
   - `/` (homepage: latest episode + reviews)
   - `/1/` … `/101/` — one page per episode (101 pages, numeric slugs)
   - `/episodes/1/` … `/episodes/21/` — episode list, 5/page
   - `/brews/1/` … `/brews/18/` — brew list, 12/page
   - `/bottle/<nanoid>/` — 215 brew detail pages. **The nanoid slugs live in
     `brews.json` and cannot be regenerated — they must be carried verbatim.**
   - `/transcripts/1/` … — 97 per-episode transcript pages (numeric slugs)
   - `/transcripts/page/1/` … `/transcripts/page/5/` — transcript list, 20/page
   - `/transcripts/` → redirect to `/transcripts/page/1` (currently an Astro
     config redirect emitting a meta-refresh page)
   - `/friends/`, `/follow/`, `/search/`, `/explore/`, `/404.html`
   - `/feed.xml` — **the podcast RSS feed. Highest-stakes URL on the site**;
     podcast apps subscribe to it. Item-by-item parity required (see Phase 4).
   - `/sitemap-index.xml` + `/sitemap-0.xml` (Zola emits `/sitemap.xml`
     instead — acceptable change, see Phase 8, but verify nothing references
     the old names)
2. **Zola lives at the repo root.** The Astro tree gets frozen under `astro/`
   as conversion input during the migration and deleted at cutover.
3. **Content is converted by script, not by hand — permanently.** Authoring
   stays YAML-frontmatter markdown under `src/content/` and JSON under
   `src/data/`, because the external FwB automation pipeline
   (`~/Scripts/Sites/fwb/` — episode/transcript/YouTube tooling) writes those
   files. `migrate/convert.py` regenerates Zola's `content/` and `data/` on
   every build, forever. This is the same decision scottwillsey landed on in
   its Phase 8, adopted here from day one.
   **Corollary: the converter never writes into `src/` — read-only, always.**
   `fwb-transcript/main.py` is coupled to the *literal textual layout* of
   episode frontmatter (it regex-strips the `descriptionRSS:`…`episode:`
   span and asserts adjacency), so even a well-meaning reformat of source
   files would break the pipeline. See "External pipeline contract" below.
4. **Python (stdlib-only where possible) does the converter, feed
   post-processing, and parity checks.**
5. **Snapshot `dist/` → `dist-baseline/` before Zola ever builds.** Note:
   the Astro `dist/` is ~1.6 GB (1.1 GB of `_astro/` image derivatives), so
   this costs real disk — but it's what makes every parity check possible.
   Do it first, before anything else.

---

## Scope analysis — what the Astro site actually is

### Content & data
| Source | Count | Destination in Zola |
|---|---|---|
| `src/content/episodes/*.md` | 101 | `content/<n>.md` at root section (URL `/N/`), converted frontmatter |
| `src/content/transcripts/*.md` | 97 | `content/transcripts/<n>.md` (URL `/transcripts/N/`) |
| `src/content/srt/*.srt` | 44 | **Not converted, but NOT orphaned** — the vector-search indexer (`~/Scripts/Sites/fwb/indexer/lib.js`) reads them for transcript cue timings. Stays in `src/content/srt/` untouched, permanently. |
| `src/data/site.json` | 1 | `zola.toml` `[extra]` (near 1:1 mapping) |
| `src/data/brews.json` | 215 brews | `data/brews.json` via converter (copied/normalized), consumed with `load_data()` |
| `src/data/reviews.json` | 24 | `data/reviews.json`, consumed with `load_data()` + `get_random()` |

Episode frontmatter fields: `title`, `description`, `descriptionRSS`
(**multi-line quoted raw HTML with escaped quotes — the gnarliest conversion
item**), `episode`, `date`, `audioFile`, `length` (HH:MM:SS), `bytes`,
`youtube` (only eps 99–101), plus a redundant `id`. Transcripts: similar
minus `descriptionRSS`. The Zod schemas in `content.config.ts` become
validation lint in the converter (known keys, required keys, date/length
format checks) so the build fails loudly on bad frontmatter — same as
scottwillsey's `render()` lint.

✅ **Resolved 2026-08-10 (pre-migration fix, branch
`descriptionrss-yaml-fix`)**: `descriptionRSS` used to be a multi-line
double-quoted scalar continuing at column 0 — invalid per the YAML spec
(the indexer's `yaml` npm package rejected it, hence its
`lenientFrontmatter()` fallback; PyYAML and Astro's js-yaml tolerated it).
All 101 episode files were rewritten with two-space-indented continuation
lines (valid YAML, parses to the identical folded-to-spaces value), and
`fwb-new-episode/main.py` now emits that form. Verified: `feed.xml`
byte-identical across the rewrite; indexer episode chunks (101) and
transcript chunks (4,246) hash-identical, so no re-embedding. The converter
can therefore use an ordinary YAML approach — no leniency port needed.

### External pipeline contract (must keep working — verified 2026-08-10)

The FwB 4.0 pipeline (`~/Scripts/Sites/fwb/`, two commands driven from the
dashboard) touches this repo in exactly these ways:

**Writes into the repo** (all must keep working after migration):
1. `fwb-new-episode/main.py` → `src/content/episodes/<N>.md` (the 10-key
   frontmatter above, in that order) and **rewrites `src/data/brews.json`**
   (4-space-indented JSON array, new entries prepended).
2. `fwb-transcript/main.py` → `src/content/transcripts/<N>.md` (episode
   frontmatter minus `descriptionRSS`, derived textually — see ground rule 3).
3. `FwBImagesWithRename.retrobatch` (Retrobatch workflow) → writes
   `<STEM><YYYYMMDD>.png` into **both** `public/images/brews/` and
   `src/assets/images/brews/`. ⚠️ Both paths are hardcoded as literal
   strings inside the Retrobatch plist, and `main.py` existence-checks both
   dirs before writing anything. **The `git mv public static` in Phase 0
   breaks these two tools** — the plist and `main.py`'s image-dir constants
   must be updated `public/` → `static/` in the same sitting (or hold
   episode publishing until cutover; there is no episode mid-flight).

**Reads from the repo** (formats that must not change):
- Episode number allocation: `max(src/content/episodes/*.md) + 1` — used by
  `fwb-video-episode.sh`, `fwb-tag-mp3.py`, `main.py`.
- The vector-search indexer (`indexer/lib.js`) parses `src/content/episodes`,
  `src/content/transcripts`, `src/content/srt/*.srt`, and
  `src/data/brews.json` **directly from source — it never reads `dist/`**.
  It also bakes URL shapes into ~4,500 DB rows: `/​<N>/`, `/transcripts/<N>/`,
  `/bottle/<id>/` (trailing-slash directory URLs). Since all URLs survive
  unchanged, the DB stays valid; a re-run of `fwb-index-embeddings` is free
  (URL changes are metadata-only, no re-embedding) if anything shifts.

**Deploy chain**: the site's `npm run build` currently chains into
`~/Scripts/Sites/fwb/deploy.sh`, which rsyncs `dist/` → the server and
ships `fwb-vectors.db`. Keeping `output_dir = "dist"` means `deploy.sh`
needs zero changes; the npm entry point is replaced by this repo's
`build.sh`/`deploy.sh` (Phase 8), and the dashboard's
(`~/Scripts/Sites/dashboard/config/fwb.yaml`) ship entry must be repointed.

**Latent breakage found during this audit** (pre-existing, but the migration
makes it permanent): `fwb-new-episode/main.py:162` mints brew ids by
shelling out to a bare `nanoid` command whose only copy on this machine is
`friendswithbrews/node_modules/.bin/nanoid` — and it isn't on PATH even
today. Replace with an inline Python nanoid-alphabet generator **before**
`node_modules` is deleted at cutover.

**Must stay unclaimed by the static site**: `/api/*` is an Apache
reverse-proxy space (search server on the host). Zola must not generate
anything under `/api/`.

### Templates (Astro → Zola mapping)
| Astro | Zola |
|---|---|
| `layouts/Base.astro` (only layout, only `<slot>`) | `templates/base.html` with blocks `title`/`description`/`main` (+ `noindex` flag via block or extra) |
| `Header.astro`, `Menu.astro`, `Footer.astro` | `templates/partials/*.html` via `{% include %}` (zero-arg) |
| `Episode.astro`, `EpisodeDetails.astro` | Tera v2 components in `templates/site_components.html` (episode_article, episode_card) |
| `BrewDetails.astro`, `PodcastLinks.astro`, `VideoEmbed.astro`, `Transcript.astro`, `TranscriptListView.astro`, `Reviews.astro` | more components in `site_components.html` / `components.html` |
| `Pager.astro` | `pager(current, total, base)` component — reimplement first/prev/next/last markup exactly |
| `Search.astro` (astro-pagefind composable UI) | `partials/search.html` — pagefind custom elements + config script + **explicit `<link>` to `pagefind-component-ui.css`** (known gotcha) |
| astro-icon `<Icon name="…"/>` (~20 Iconify icons, 8 sets) | `templates/icons.html` — one Tera component per icon, inline SVG extracted once from `node_modules/@iconify-json/*` before cutover |
| `astro:assets` `<Picture>`/`<Image>` | `img`/`picture` components using `get_image_metadata()` + `resize_image()` (see Phase 5) |
| `src/pages/*.astro` routes | page templates + converter-generated stub pages with `path` + `template` overrides |
| `feed.xml.js` endpoint | `templates/rss.xml` (Tera) + `migrate/postbuild.py` (see Phase 4) |

### Client-side JS inventory (all portable as-is)
1. Fathom analytics `<script>` in base — copy verbatim.
2. Pagefind runtime + component UI (`/search/`, `/404.html`) — Pagefind is
   SSG-agnostic; run via PyPI package in a repo-local `.venv` (the
   scottwillsey-proven route; brew/uv don't work for it). The
   `PagefindConfig` bootstrap JS that astro-pagefind bundles must be
   replicated as a small static script (extract from the built
   `dist-baseline/_astro/PagefindConfig.*.js`).
3. `/search/` autofocus inline script (~20 lines) — copy verbatim.
4. `/explore/` semantic search (~250-line inline script hitting
   `POST /api/search`) — copy verbatim into the explore template.
   **Dev-loop note:** Astro's Vite proxy (`/api` → `FWB_API_TARGET`) has no
   Zola equivalent; production is unaffected (Apache vhost proxies `/api/`).
   For local dev, `dev.sh` gets a tiny Python reverse-proxy for `/api` (or
   we accept that /explore only fully works in production/preview — decide
   in Phase 7).
5. lite-youtube custom element (from astro-embed, eps 99–101 + lists) —
   vendor the lite-youtube script into `static/scripts/`, write a
   `video_embed(id, title)` component emitting the same markup.

**There is no audio player and no theme toggle** (light theme only).
`public/images/player/` is an orphaned remnant — delete at cutover.

### CSS
- `src/styles/fwb.css` (241 lines) → `static/css/fwb.css` served directly.
  **No Tailwind, no Sass, no build step at all** — simpler than scottwillsey.
- Replace npm imports at the top of the file by vendoring: `normalize.css`
  and the woff2 files from `@fontsource/be-vietnam-pro` (+900/500/200),
  `@fontsource/ia-writer-mono` into `static/fonts/` with hand-written
  `@font-face` rules. (`roboto-mono` is imported but unused — drop it and
  note the finding.)
- Flatten the scoped `<style>` blocks from 11 components + 7 pages into
  global CSS with explicit class selectors (Zola has no scoped styles).
  `explore.astro`'s `is:global` block moves over unchanged.
- The Pagefind `--pf-*` theming block carries over unchanged.

### Images — the biggest structural decision
- `src/assets/images/` (397 MB, astro:assets sources) and
  `public/images/brews/` (335 MB full-size originals) are near-duplicates;
  Astro's `dist/` ships 1.1 GB of Sharp-generated avif/webp/jpg variants.
- Zola's `resize_image()` outputs **jpg/png/webp only — no AVIF**. Decision:
  drop the avif variants, emit `<picture>` with webp + jpg fallback at the
  same widths (brew cards 400/800w, bottle pages 1500/2000w). Bytes go up
  somewhat per image; page weight stays reasonable and the visual result is
  identical. (If avif ever matters, a postbuild `cavif`/ffmpeg pass can be
  added later — out of scope now.)
- `resize_image()` reads sources from the repo root, so `src/assets/images/`
  keeps working in place, same as scottwillsey.
- **16-bit PNG sweep required before Phase 5**: Zola's webp encoder fails on
  16-bit PNGs (sharp tolerated them). Scan all 218 brew PNGs + episode
  images with `file`/ImageMagick; normalize offenders with
  `ffmpeg -i in.png -pix_fmt rgb24 out.png`. Document the constraint for
  future brew photos.
- `public/images/brews/` originals remain the full-size click-through
  targets — `git mv public static` carries them untouched.
- Build-time cost: first `zola build` will resize ~460+ variants from large
  PNGs; output is cached in `static/processed_images/` (gitignored)
  afterward. Budget a slow first build.

### The podcast feed (Phase 4 — highest risk)
`src/pages/feed.xml.js` does four Zola-hostile things:
1. Renders each episode's markdown body to HTML at build time
   (`experimental_AstroContainer`) → Zola equivalent: `page.content` in the
   feed template — free.
2. Absolutizes relative hrefs/srcs and sanitizes (strips script/style, tag
   allowlist) via ultrahtml → Zola equivalent: `migrate/postbuild.py`
   operating on the built `dist/feed.xml`, same technique as scottwillsey's
   postbuild (regex on the XML-escaped text; here on CDATA content, which is
   *unescaped*, so patterns differ — write both modes carefully).
3. CDATA-wraps `description`/`content:encoded`/`itunes:summary` — in Tera we
   emit `<![CDATA[…]]>` directly, no placeholder hack needed.
4. Full iTunes namespace, channel + per-item: `enclosure url/length/type`,
   `itunes:episode`, `itunes:duration`, `itunes:image`, `itunes:episodeType`,
   `itunes:explicit`, channel `itunes:category` (nested), `itunes:owner`,
   `itunes:new-feed-url`, etc. All template-able from `[extra]` fields; the
   converter precomputes `rfc2822_date` per episode (byte-parity port of
   `DateFormat.mjs`, forced UTC/GMT labeling exactly as date-fns emits it).

`descriptionRSS` (raw HTML, 101 files) is carried by the converter into
`[extra] description_rss` as a TOML multi-line string, emitted verbatim
inside CDATA. Where absent, fall back to `description` (same logic as now).

**Parity bar: item-by-item diff of every field and content body across all
101 items against `dist-baseline/feed.xml`, zero metadata mismatches.** This
is a live podcast feed with subscribers; this phase does not ship on "looks
right."

### Search (Pagefind)
All the `data-pagefind-*` annotations (ignore, meta title/result-type/
episode/date, `filter by[content]` with episode/transcript/brew-type values)
are plain HTML attributes — they move into the Tera templates verbatim.
Verify the filter pane shows the same filter counts as baseline, and compare
unique-word counts between Pagefind runs on `dist-baseline/` vs `dist/`.

### Things Zola gives us for free / things we lose
- **Free**: sitemap (built-in), pagination structs (though we'll mostly use
  stubs, see below), taxonomy machinery (unused here — no tags on FwB),
  single-binary toolchain (goodbye ~460 npm packages).
- **Lost / needs handling**: Zod validation (→ converter lint), avif
  (→ webp+jpg), Vite dev proxy (→ dev.sh shim), astro-seo (dead dep — no
  loss), sitemap `filter` for `/explore` (→ postbuild strips the `/explore/`
  entry from `sitemap.xml`, preserving current behavior).
- **Known current bugs to NOT reproduce blindly** (decide: fix or preserve):
  - `Footer.astro` passes the `year` function object instead of calling it
    (footer year likely renders wrongly today). Converter/template will emit
    the correct year; check baseline HTML to see what parity even means here.
  - `Base.astro` renders an empty `<meta name="description">` on most pages
    (pages pass only `title`). Preserve as-is for parity; fix later.
  - `[id].astro` passes `<Content/>` into `Episode` which has no slot
    (silently dropped today) — irrelevant after migration, Episode component
    renders its own content.

---

## Repo layout on this branch (target state)

```
friendswithbrews/
├── zola.toml
├── content/                  # GENERATED by migrate/convert.py — do not hand-edit
│   ├── _index.md             #   hand-maintained section config (episodes at root)
│   ├── <n>.md                #   101 episode pages → /N/
│   ├── transcripts/          #   _index.md + 97 pages → /transcripts/N/
│   ├── listpages/            #   stubs: episodes-1..21, brews-1..18, transcripts-1..5
│   ├── bottle/               #   _index.md + 215 stubs → /bottle/<nanoid>/
│   └── pages/                #   friends, follow, search, explore stubs
├── data/                     # GENERATED: brews.json, reviews.json
├── templates/                # base, page templates, partials/, components, icons.html, rss.xml
├── static/                   # was public/ (git mv): images, fonts (vendored), scripts, .htaccess, favicons
├── src/                      # authoring tree (unchanged — external pipeline writes here)
│   ├── content/{episodes,transcripts,srt}/
│   ├── data/{site,brews,reviews}.json
│   └── assets/images/        # resize_image sources, read in place
├── migrate/
│   ├── convert.py            # permanent build step 1
│   ├── postbuild.py          # feed absolutize/sanitize + sitemap /explore strip
│   └── parity.py             # URL-set diff, feed item diff (actually commit it this time)
├── build.sh dev.sh preview.sh deploy.sh
├── dist/                     # zola output (output_dir = "dist" so deploy.sh is untouched)
├── dist-baseline/            # frozen Astro build (gitignored), for parity
└── astro/                    # frozen Astro tree during migration; DELETED at cutover
```

`zola.toml` sketch:
```toml
base_url = "https://friendswithbrews.com"
title = "Friends with Brews"
output_dir = "dist"
generate_feeds = false          # feed comes from an explicit stub/template, not Zola's default
build_search_index = false      # Pagefind
compile_sass = false

[markdown]
smart_punctuation = true        # verify against baseline in Phase 1 — Astro remark default
external_links_external = false # parity: Astro didn't add rel="external"

[extra]                         # ← contents of src/data/site.json, flattened
audio_prefix = "https://pints.friendswithbrews.com/"
episodes_paginate_by = 5
brews_paginate_by = 12
transcripts_paginate_by = 20
# social links, name, email, rss image, tagline …
```

URL-shape notes:
- Episodes live at the **root section** with `slug = "<episode number>"` so
  URLs stay `/N/` — exactly the scottwillsey root-posts pattern.
- All three paginated lists use **converter-generated stub pages** with
  `path` overrides (`/episodes/1`…), not Zola's paginator — Astro's page
  sizes and URL shapes carry over exactly, and `/transcripts/page/N` can't
  be expressed by Zola pagination anyway. Template slices the section pages
  (or brews.json) with `[first:last]`.
- `/bottle/<nanoid>/`: one stub per brew, `path = "/bottle/<id>"`, brew data
  embedded in `[extra]` by the converter (self-contained beats a template
  `load_data`+filter lookup). Episode-number→title map for the "appeared on"
  line is precomputed into each stub too.
- `/transcripts` redirect: `aliases = ["/transcripts"]` on the
  transcripts-page-1 stub emits the meta-refresh page — matches Astro's
  redirect output. Transcripts section `_index.md` gets `render = false`.
- Homepage is a standalone template (latest episode + 3 random reviews via
  `get_random()` — build-time randomness, same semantics as today).

---

## Tooling to install
- Zola 0.23.x (brew)
- Pagefind via PyPI in repo-local `.venv` (`python3 -m venv .venv &&
  .venv/bin/pip install pagefind[extended]`)
- ImageMagick or ffmpeg available for the 16-bit PNG sweep (one-off)
- Nothing else. Node/npm fully retired at cutover.

---

## Phases

Ordered so the riskiest unknowns (converter + feed) surface earliest.
Each phase ends with a parity check against `dist-baseline/`.

### Phase 0 — Baseline + restructure + scaffold ✅ 2026-08-10
- [x] Snapshot `mv dist dist-baseline` (gitignored). Used the verified
      post-descriptionRSS-rewrite build (byte-parity proven vs its own
      2-build nondeterminism floor), so no fresh `buildonly` was needed.
- [x] Baseline URL inventory → `migrate/baseline-urls.txt` (**475 URLs**:
      pages + root-level files; hashed `_astro/`/`pagefind/` assets
      deliberately excluded).
- [x] Extracted while node_modules exists → `migrate/reference/`:
      `pagefind-config-bootstrap.js`, `lite-youtube-inline.js` (the inline
      module astro-embed emits, 3.5 KB), `normalize.css`, fontsource CSS
      (for `@font-face`/unicode-range porting in Phase 6), and **24** icon
      SVGs in `icons/` (20 literal `<Icon>` uses + 4 from `brewIcon()`).
- [x] Vendored fonts → `static/fonts/vendor/` (26 files: be-vietnam-pro
      200/400/500/900 × latin/latin-ext/vietnamese woff2+woff,
      ia-writer-mono latin-400). roboto-mono dropped (imported, unused).
- [x] `git mv`: `astro.config.mjs`, `package.json`, lockfile,
      `tsconfig.json`, `scripts/`, `.githooks` → `astro/`;
      `git mv public static`. `src/` untouched at root.
- [x] Pipeline path edits same sitting: `FwBImagesWithRename.retrobatch`
      line 138 and `main.py` `SITE_BREW_PUBLIC` now point at
      `static/images/brews`; `FWB_WORKFLOW.md` updated.
- [x] Scaffold: `zola.toml` (site.json flattened into `[extra]`),
      `content/_index.md`, placeholder `templates/index.html`.
      `zola build` clean in ~120 ms. Findings: `hard_link_static = true`
      (static/ is ~530 MB — hard links, not copies), `ignored_static =
      ["*.DS_Store"]` (deploy rsync has no exclude), `.htaccess` confirmed
      copied, and Zola emits `robots.txt` + `sitemap.xml` + a default
      `404.html` for free.

### Phase 1 — Content converter (`migrate/convert.py`) ✅ 2026-08-10
- [x] Frontmatter parser (stdlib-only YAML subset: top-level scalars,
      JSON-escape-decoded quoted values, indented multi-line folding).
      **Cross-checked against PyYAML on all 198 files: 1,432 values, 0
      mismatches.** Real-data quirks handled: episode 44 uses YAML's
      backslash-space escape (folded to a space, matching the baseline feed
      bytes); transcript 60 has trailing whitespace on frontmatter lines
      (tolerated — frontmatter rstripped, body untouched); transcripts 1–47
      use historical `id: "T<n>"` (allowed).
- [x] Validation lint replacing Zod; non-zero exit fails the build. Found a
      genuine typo Zod's unanchored regex had let through: transcript 44
      `length: 00:41:10g` — **fixed in src** (episode 44 confirms 00:41:10).
      Mud Season's empty brew description is warn-only (old site rendered
      an empty quote).
- [x] Episodes → `content/<n>.md` with precomputed `duration`,
      `display_date` (America/Los_Angeles, hardcoded English names — no
      locale dependence), `rfc2822_date` (UTC "GMT" — byte-matches
      @astrojs/rss's toUTCString output in the baseline feed), and
      `has_transcript`.
- [x] Transcripts → `content/transcripts/<n>.md`.
- [x] `{% raw %}` protection implemented (fence-independent, line-wise);
      current content has zero literal Tera braces — guard is for future
      episodes.
- [x] Inline `/images/episodes/…` images verified passthrough-safe.
- [x] `data/brews.json` + `data/reviews.json` copied for `load_data()`
      (`sortOrder` carried).
- [x] Stubs: 21 episode-list + 18 brew-list + 5 transcript-list pages
      (page 1 carries `aliases = ["/transcripts"]`, replacing the Astro
      config redirect — Zola emits a JS + meta-refresh + noscript page);
      215 bottle stubs with the full brew object and episode-title map in
      `[extra]` (nanoid ids survive verbatim in `path` — case preserved,
      leading `_`/`-` filenames fine; no case collisions on APFS, checked).
      Hand-maintained: all `_index.md` files + `content/pages/{friends,
      follow,search,explore}.md`.
- [x] `write_if_changed` + `prune_stale` from day one.
- [x] Parity: `zola build` renders **461 pages in ~250 ms**; URL-set diff
      vs `baseline-urls.txt` shows exactly the three expected deltas —
      `/feed.xml` missing (Phase 4), `sitemap-index.xml`/`sitemap-0.xml` →
      `sitemap.xml` (open question #2), `robots.txt` added. Placeholder
      templates created for episode/transcript/lists/bottle/single pages
      (replaced in Phases 2–3).

### Phase 2 — Core templates ✅ 2026-08-10
- [x] `base.html` — head parity incl. the empty-meta-description quirk,
      view-transition meta, font preload, RSS alternate, Fathom. Links
      `/css/fwb.css` (created in Phase 6 — 404s until then, site is
      deliberately unstyled mid-migration).
- [x] Partials header/menu/footer. Finding: the Footer `{year}` "bug" was
      not a bug — Astro *calls* function children, baseline shows ©2026;
      ported as `now() | date(format="%Y")`.
- [x] Components in `site_components.html`: episode_article, episode_card,
      podcast_links, video_embed (lite-youtube markup from baseline; the
      element script vendored to `static/scripts/lite-youtube.js`, included
      conditionally per page), brew_details (interim full-size `<img>` —
      Phase 5 replaces with resize_image `<picture>`), reviews (3 distinct
      random picks via get_random + modular index math; verified distinct
      across 5 builds). Tera v2 lessons: components can't see `config`
      (→ converter now copies `site.json` to `data/` for `load_data`),
      top-level `set`s are invisible inside blocks under `extends`, and no
      method chaining on function calls.
- [x] `icons.html`: **24** icon components generated by
      `migrate/gen-icons.py`, replicating astro-icon's
      `<svg><symbol><use>` markup (`data-icon` attrs preserved for CSS),
      plus a `brew_type_icon` dispatcher replacing `brewIcon()`.
- [x] Pages: `/`, `/N/` (finding: `[id].astro` passed
      `title.toUpperCase()` — ported with `| upper`), `/friends/` (host
      portraits via `resize_image` 200×200 fill/webp — full parity),
      `/follow/`.
- [x] Converter addition: `autolink_bare_urls()` — remark-GFM autolinked
      bare URLs, pulldown-cmark doesn't; episode 100 had 6, now wrapped in
      `<…>` autolinks (identical rendered output).
- [x] Parity via committed `migrate/parity.py` (urls/page/pages modes,
      text+links+images extraction): **all 101 episode pages have 0
      text/link differences**; `/friends/` and `/follow/` pass fully incl.
      images; homepage diffs are exactly the random-review sentences (same
      per-build nondeterminism as Astro) + the Phase 5 brew images.

### Phase 3 — Lists + pagination
- [ ] `pager` component matching `Pager.astro` markup (first/prev/next/last).
- [ ] `episodelist.html`, `brewlist.html`, `transcriptlist.html` templates
      slicing via stubs; `/bottle/<id>/` template.
- [ ] `/transcripts` alias redirect.
- [ ] Parity: full URL-set diff dist vs baseline; spot byte-diff
      `/episodes/2/`, `/brews/18/` (last-page edge), `/transcripts/page/5/`.

### Phase 4 — Podcast RSS feed ⚠️ highest stakes
- [ ] Feed stub page (`path = "/feed.xml"`, `template = "rss.xml"`) or
      section-feed approach — whichever yields the exact `/feed.xml` URL.
- [ ] `templates/rss.xml`: full channel + item structure per the scope
      analysis; CDATA blocks; `page.content` as content:encoded.
- [ ] `migrate/postbuild.py`: absolutize relative URLs inside CDATA,
      strip script/style (lite-youtube!), enforce the 30-tag allowlist
      behavior where it actually matters (inspect what sanitize changes in
      baseline first — it may be a no-op on real content).
- [ ] `migrate/parity.py` feed mode: parse both feeds, diff every field of
      every item + channel. **Bar: 0 metadata mismatches, content bodies
      equivalent (whitespace-insensitive), across all 101 items.**
- [ ] Validate with a podcast feed validator (castfeedvalidator or
      podba.se) before calling it done.

### Phase 5 — Images
- [ ] 16-bit PNG sweep across `src/assets/images/**` + normalize; document
      the constraint in README for future brew photos.
- [ ] `picture` component: `get_image_metadata()` + `resize_image()` webp+jpg
      at 400/800 (brew cards) and 1500/2000 (bottle pages); `<picture>`
      markup with srcset matching Astro's structure minus avif.
- [ ] Host portraits + 404 image via simple `img` component.
- [ ] Full-size originals in `static/images/brews/` remain click-through
      targets, root-relative URLs.
- [ ] Parity: visual diff of a brew card, a bottle page, /friends, /404;
      confirm CLS-preventing width/height attrs present.
- [ ] Decide: prune `public→static/images/brews` vs `src/assets` duplication?
      (Recommend: keep both for now — originals are load-bearing link
      targets; revisit after cutover.)

### Phase 6 — Styling
- [ ] `static/css/fwb.css`: fwb.css minus npm imports, plus vendored
      normalize + @font-face rules, plus all 18 flattened scoped-style
      blocks (class-scoped by hand; grep baseline HTML for the actual
      class names in use).
- [ ] Drop roboto-mono (unused) — note in commit message.
- [ ] Parity: headless-Chrome visual pass over every template type at
      desktop + <900px (menu reflow breakpoint).

### Phase 7 — Search + Explore
- [ ] Pagefind via `.venv` post-build; replicate PagefindConfig bootstrap as
      a static script; **explicit `<link>` to `pagefind-component-ui.css`**.
- [ ] All `data-pagefind-*` attributes carried into templates; verify filter
      pane values (episode/transcript/beer/coffee/tea/water) match baseline.
- [ ] Search autofocus script; `/404.html` search box.
- [ ] `/explore/` template with the client script verbatim; decide the dev
      proxy approach (Python shim in dev.sh vs prod-only).
- [ ] Parity: run identical Pagefind against baseline and new dist, compare
      unique-word counts and filter counts; exercise /explore against prod.

### Phase 8 — Cutover
- [ ] `migrate/postbuild.py`: strip `/explore/` from `sitemap.xml`
      (preserves the current sitemap filter).
- [ ] Update `static/.htaccess`: keep 404 + cache rules; replace the
      `^/_astro/` immutable rule with `^/processed_images/` (Zola's hashed
      output); keep the `pf_*` rules.
- [ ] `build.sh` (serve-guard → trash-mv dist → convert.py → zola build
      --force → postbuild.py → pagefind), `dev.sh` (src/ poll loop,
      `--extra-watch-path data`, cleanup traps, optional /api shim),
      `preview.sh`, `deploy.sh` (build.sh + existing
      `~/Scripts/Sites/fwb/deploy.sh` — the rsync side needs zero changes
      since `output_dir = "dist"`).
- [ ] Delete `astro/` (package.json, lockfile, node_modules, configs,
      `scripts/check-overrides.mjs`, `.githooks/`), delete
      `static/images/player/` orphans.
- [ ] Retire the pipeline's npm couplings (audited 2026-08-10, see the
      pipeline-contract section — the full list):
      - Replace the `nanoid` shell-out in
        `~/Scripts/Sites/fwb/fwb-new-episode/main.py` with inline Python
        **before deleting `node_modules`**.
      - Repoint the dashboard ship entry
        (`~/Scripts/Sites/dashboard/config/fwb.yaml`) from `npm run build`
        to this repo's `build.sh`/`deploy.sh`.
      - Confirm the Phase-0 Retrobatch/`main.py` path edits took
        (`static/images/brews`).
      - Update pipeline docs (`FWB_WORKFLOW.md` key-paths table,
        `FWB_VECTOR_SEARCH.md` "npm run build runs deploy.sh" note).
- [ ] Verify the pipeline end-to-end after the above: it writes
      `src/content/` + `src/data/`, dev.sh picks it up, build.sh publishes
      it, `fwb-index-embeddings` still indexes (it reads `src/` directly,
      never `dist/`, so it should be untouched — verify anyway).
- [ ] README rewrite (Zola workflow, image constraints, "content/ and data/
      are generated" warnings in `_index.md` comments).
- [ ] Final parity sweep: full URL-set diff, feed diff, visual pass. Deploy.

### Post-cutover hardening (budget for it)
scottwillsey needed ~9 follow-up commits once the site was used in anger
(dev-loop wedging, watch paths, stale comments). Expect the same class of
issues here, plus one FwB-specific rehearsal: **publish a fake episode 102
end-to-end through the pipeline on a branch before the next real episode.**

---

## Post-migration tasks (after cutover, not part of the migration)

1. **Backfill the 4 missing transcripts** (episodes **53, 97, 98, 99** — the
   only gaps in 1–101). Send the episode audio (from
   `pints.friendswithbrews.com` / the iCloud back catalog) to ElevenLabs,
   then build and format the transcripts per the pipeline spec
   (`Speaker: text` paragraphs, episode frontmatter minus `descriptionRSS`,
   same shape `fwb-transcript/main.py` produces). Speaker labels come back
   as "Speaker 1/2" — Scott verifies which is Scott and which is Peter
   before publishing. Output lands in `src/content/transcripts/{53,97,98,99}.md`
   and flows through the converter like any other transcript
   (`has_transcript` flips automatically on the episode pages).

## Open questions

1. **Avif**: confirmed acceptable to drop (webp+jpg parity)? Affects brew
   card/bottle page bytes only, not the feed.
2. **Sitemap filenames**: Astro emits `sitemap-index.xml`/`sitemap-0.xml`;
   Zola emits `sitemap.xml`. Anything (Search Console?) reference the old
   names? If yes, add redirects or postbuild aliases.
3. **`/explore` local dev**: Python /api shim in dev.sh, or prod-only
   testing?
4. **Meta description bug**: preserve empty descriptions for strict parity,
   or fix during migration (pages pass description = site tagline)?
5. ~~**srt files**: keep or archive?~~ **Resolved 2026-08-10: keep in
   `src/content/srt/` permanently** — the vector-search indexer reads them
   for transcript cue timings.
6. **`brews.json` `sortOrder`**: dead field on the site — but the pipeline
   still emits it, so the converter carries it. No action.
7. **Timing vs episode 102**: the Phase-0 `public→static` path edits make
   the pipeline's image step point at the migrated layout. If an episode
   must ship mid-migration, either finish cutover first or temporarily
   symlink `public → static`. (Recommend: don't publish mid-migration;
   scottwillsey's took a day.)
