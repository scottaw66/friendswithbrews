# Friends with Brews → Zola Migration Plan

## ⏱ STATUS (updated 2026-08-14)

**Phases 0–8 ALL DONE (2026-08-14). The migration is complete and
final-parity-proven; the only remaining step is the production deploy
(`./deploy.sh`), plus the post-cutover hardening below (including the
fake-episode-102 pipeline rehearsal before the next real episode).**

- Branch: `zola-migration` (pushed). Companion pipeline changes are on
  `website-scripts` main (also pushed).
- Working loop: `python3 migrate/convert.py && zola build &&
  python3 migrate/postbuild.py`, then `python3 migrate/parity.py page
  /<url>/` (or `urls` / `pages` / `feed`) against the frozen
  `dist-baseline/` (gitignored — do NOT delete it; it's the parity truth
  and can't be regenerated without restoring the Astro toolchain).
- **/feed.xml is live and parity-proven**: 0 field mismatches across all
  101 items vs baseline (`parity.py feed`), byte-deterministic across
  rebuilds, and the W3C feed validator returns *identical* results for
  our feed and the live one (5 pre-existing quirks, see Phase 4 notes —
  post-cutover candidates, not regressions).
- npm/Astro are GONE (Phase 8): `astro/`, node_modules, and the npm-era
  lint configs are deleted; build/dev/preview/deploy are the four shell
  scripts at the repo root. The old `npm run build` footgun no longer
  exists.
- Site state: EVERY page is real and parity-proven — content, images
  (Phase 5: structural picture sweep over 464 pages, 0 diffs), CSS
  (Phase 6: visual pass ≤0.3% everywhere), search + explore (Phase 7:
  pagefind filters/queries identical to baseline). Final sweep after
  cutover work (`parity.py pages`): only the known accepted set remains —
  homepage (random reviews), `/transcripts/` (alias-redirect markup,
  equivalent), `/transcripts/45/` (below). `parity.py urls`: only the
  accepted sitemap rename (sitemap-0/-index.xml → sitemap.xml, plus
  robots.txt gained). Feed: 0 field mismatches.
- Accepted divergence: transcript 45's censored `f**_ing s_**` — remark
  parsed the markers as strong/em, pulldown-cmark leaves them as literal
  text (closer to the source). One page, cosmetic; revisit only if it
  bothers anyone.
- Then: deploy, post-cutover hardening (fake-episode-102 rehearsal!),
  and the post-migration tasks section below (transcript backfill for
  eps 53/97/98/99).

---

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

### Phase 3 — Lists + pagination ✅ 2026-08-13
- [x] `pager` component matching `Pager.astro` markup (first/prev/next/last;
      First only from page 3, Last hidden on the penultimate/last page —
      ported conditions verified against baseline edge pages).
- [x] `episodelist.html`, `brewlist.html`, `transcriptlist.html` slicing
      via the stubs' `page_num`. Tera v2 gotchas hit: there is **no
      `slice` filter** — use `array[start:end]` — and `| int` **refuses
      non-integer floats** (5.8 errors), so ceil-division is
      `| round(method="floor") | int`.
- [x] `bottle.html` from stub `[extra]` (interim full-size `<img>` like
      brew_details — Phase 5 swaps in the `<picture>`). Converter now
      precomputes `url_hostname`/`url_origin` per brew (Tera can't parse
      URLs) for the "<name> on <hostname>" line.
- [x] `transcript.html` + `transcript_article`/`transcript_list_item`
      components (ports of `Transcript.astro`/`TranscriptListView.astro`).
- [x] `/transcripts` alias redirect verified (Zola JS+meta-refresh page →
      /transcripts/page/1/; different markup than Astro's, equivalent).
- [x] Converter: GFM **www-autolink** ported — transcripts 13/84 carry
      literal `<www.…>` spans that remark linked (http:// prefix, angle
      brackets left as text); `autolink_bare_urls()` now emits
      `[www.x](http://www.x)` for scheme-less www domains.
- [x] Parity: URL diff clean (same three known deltas); page-mode on
      `/episodes/{1,2,21}/`, `/brews/{1,18}/`, `/transcripts/page/{1,5}/`,
      transcripts, bottles — plus a full `pages` sweep: zero text/link
      diffs site-wide except the known set (homepage reviews, search/
      explore placeholders, `/transcripts/` redirect markup, transcript
      45's `f**_ing s_**` accepted divergence). Remaining diffs are
      image-only (Phase 5).

### Phase 4 — Podcast RSS feed ✅ 2026-08-13
- [x] Section-feed approach (the scottwillsey pattern): config
      `feed_filenames = ["feed.xml"]` + `generate_feeds = true` on the
      root `_index.md` → `templates/feed.xml` renders at exactly
      `/feed.xml`, episodes only (transcripts/stubs can't leak in).
- [x] `templates/feed.xml`: channel + item structure matches the
      @astrojs/rss output element-for-element. `<description>` is
      descriptionRSS in real CDATA (verbatim, entities untouched);
      content:encoded / itunes:summary / summary are Tera-escaped text —
      exactly how the Astro serializer emitted them (it escaped the
      customData CDATA away). rfc2822_date/length/bytes come from the
      converter-precomputed `[extra]`.
- [x] `migrate/postbuild.py` (ported from scottwillsey): absolutizes
      href/src inside escaped content:encoded, strips script/style
      (verified a no-op on current content — sanitize never fired in the
      baseline either; zero relative URLs and zero script/style there).
      `<description>` CDATA deliberately untouched: the old feed carried
      descriptionRSS verbatim, including 9 episodes' relative
      `../../assets/images/` srcs (pre-existing live-feed quirk, kept for
      parity — post-cutover fix candidate).
- [x] **Converter fix surfaced by feed diffing**: episodes 8, 30, 40, 42,
      43, 54, 60, 63, 64 inline images via `../../assets/images/…`
      (astro:assets used to optimize them; Zola passed them through
      broken). `rewrite_asset_images()` initially pointed bodies at the
      full-size `/images/…` copies; superseded in Phase 5, which rewrites
      them to `content_image` component calls matching the baseline's
      optimized webp output.
- [x] `migrate/parity.py feed` mode: parses both feeds, diffs channel +
      every field of every item; metadata exact, description
      whitespace-insensitive, content:encoded as extracted
      text/links/imgs (img srcs stem-normalized: `/_astro/<stem>.<hash>`
      ↔ `/images/…/<stem>`). **Result: 0 field mismatches across all 101
      items**; feed byte-identical across rebuilds.
- [x] Validated with the W3C feed validator (direct input): our feed and
      the LIVE feed return identical results — "does not validate" on 5
      pre-existing quirks the validator dislikes but Apple accepts, all
      present in the live feed for years: channel `itunes:title`,
      "Society & Culture" nested under Technology, `itunes:explicit>No`
      (validator wants true/false), custom `<summary>` item element, and
      the atom namespace URI's trailing slash (prefix is unused anyway).
      Post-cutover cleanup candidates; changing them now would break
      parity.

### Phase 5 — Images ✅ 2026-08-14
- [x] 16-bit PNG sweep across `src/assets/images/**`: 4 offenders (all
      brews). Normalized with ffmpeg — `-pix_fmt rgb24` for the 2 RGB
      files, **`-pix_fmt rgba` for the 2 with alpha** (the plan's rgb24
      recipe would have stripped transparency). Constraint + both recipes
      documented in README.
- [x] `brew_picture` component (site_components.html): webp `<source>` +
      jpg fallback `<img>` via `get_image_metadata()` + `resize_image()`.
      Matches Astro's OBSERVED baseline behavior: requested widths
      (cards 400/[400,800], bottles 1000/[1500,2000] — from the frozen
      .astro sources) are clamped to the source's intrinsic width and
      deduped (never upscale; e.g. a 700px source gets a single 700w
      variant), while the `<img>` keeps the requested width attr with
      height derived from the aspect ratio (baseline bottle imgs are all
      1000×1000). Tera v2 has no `concat` filter — srcsets are built by
      string concatenation. Dropping the jpeg `<source>` is safe: browsers
      never used the baseline's png fallback (the jpeg source preceded
      it), so non-webp browsers get jpg either way.
- [x] **In-content episode images (found by the pages sweep, not in the
      plan)**: the 9 episodes' `../../assets/images/…` markdown images —
      Phase 4 had pointed them at full-size PNGs, but the baseline pages
      serve optimized webp at intrinsic size. New `content_image`
      component (webp transcode, width/height attrs, empty srcset like
      astro:assets emitted); `convert.py rewrite_asset_images()` now
      rewrites those markdown images to component calls. ⚠️ Ordering
      gotcha: the rewrite must run AFTER `protect_tera()`, or the
      injected calls get `{% raw %}`-wrapped and render as literal text
      (with smart-quoted attrs, breaking page AND feed).
- [x] Host portraits (done in Phase 2) + 404 image via plain
      `resize_image` `<img>`; **templates/404.html created** (was still
      Zola's built-in default): full Astro markup minus the Pagefind
      search block (Phase 7 TODO), links kept byte-identical including
      the pre-existing relative `brews/1` quirk.
- [x] Full-size originals in `static/images/brews/` remain click-through
      targets — all 215 bottle-page `<a href="/images/brews/…">` targets
      verified present in dist/.
- [x] Parity: structural sweep of every `<picture>` site-wide (webp/jpg
      srcset widths, alt, width/height attrs) vs baseline: **464 pages,
      0 diffs**. `parity.py pages` back to the known accepted set only;
      `parity.py feed` **0 field mismatches**, feed still byte-identical
      across rebuilds. parity.py updated for Phase 5 reality: srcset
      entries split per-URL with width descriptors, avif entries excluded
      (intentionally dropped), optimized png/jpeg→jpg normalization,
      image compare is now set-based (the dropped jpeg source changes
      multiplicity, not coverage), and `_feed_img_stem` accepts
      `/processed_images/`. Also fixed a latent ext-parse bug (regex
      backtracking read `.avif` as ext `f`, so avif was never being
      matched).
- [x] Decided: keep the `static/images/brews` / `src/assets` duplication —
      originals are load-bearing link targets; revisit after cutover.
- Build cost: first image build ~110s CPU / 12s wall, 1542 variants in
  `static/processed_images/` (cached, gitignored); incremental builds
  ~2.4s.

### Phase 6 — Styling ✅ 2026-08-14
- [x] `static/css/fwb.css` (42KB, no build step): vendored @font-face
      (Be Vietnam Pro 200/400/500/900 ×3 subsets + iA Writer Mono, from
      `migrate/reference/fontsource-css/` with URLs pointed at
      /fonts/vendor/) + normalize.css v8 verbatim + `src/styles/fwb.css`
      minus its npm @imports + the flattened scoped blocks + lite-youtube
      CSS vendored from astro-embed's bundle. The baseline shipped its
      CSS as Base.css + episodelength.css + 11 distinct inline <style>
      blocks — all merged into the one file.
- [x] Scoped-block flattening: component blocks scope under their root
      class (.brew, .episode, .elv, .episode-links, .nav-container,
      .footer, .pager, .reviews); page blocks scope under a per-page
      class that a new `main_attrs` block in base.html puts on `<main>`
      (.home-page/.follow-page/.bottle-page/.friends-page/
      .transcript-page/.transcriptlist-page/.notfound-page — attrs are
      invisible to text/link parity). 12 colliding class names
      (.brew-details, .download-link, .episode-links, .host, .links, …)
      plus bare a/h2/h3/nav/[data-icon] selectors kept apart this way;
      the fwb.css header comment documents the trap.
- [x] Dropped as dead weight (verified 0 referencing pages): roboto-mono
      fonts (imported, never used), astro-embed's twitter/vimeo/
      mastodon/bluesky CSS, `baseline-status` widget CSS, and
      GlobalStyles.qGGGZqmz.css (unreferenced by any baseline page).
      search page's tiny scoped block + Search component CSS → Phase 7.
- [x] Mechanical coverage check (scripted): every declaration in the
      baseline CSS (both bundles + all inline blocks, modulo the dead
      set) exists in the new fwb.css under an equivalent selector and
      media query — **0 missing rule-parts** (media queries normalized:
      the bundler rewrote max-width to range syntax).
- [x] Visual pass, headless Chrome, 11 page types × 1280/800/390px, new
      vs baseline screenshots pixel-diffed: **every page ≤0.3% differing
      pixels** (antialiasing/codec noise; /follow and /transcripts/page/1
      are 0.00%) except /404 (3–7.6%: the Phase 7 search UI isn't there
      yet) and the homepage (0.9–2.1%: random build-time reviews).
- [x] Markup bugs the visual diff caught (all fixed): (1) icon widths —
      astro-icon emits width from the viewBox aspect ratio ceiled to 2dp
      (fontisto:podcast 0.84em, ps:rss 0.96em, fa-solid:coffee 1.25em),
      gen-icons.py now replicates that; (2) whitespace glue — the old
      JSX emitted `•<span>` (episode titles) and `<svg><a` (transcript
      headings) with no whitespace, so titles form one unbreakable token
      (overflow at narrow widths = old-site behavior, preserved) and
      headings sit 4px tighter — our templates now glue them the same
      way; (3) h2.latest sits inside a span, so the flattened homepage
      h2 margin rule needed explicit .latest/.edward selectors, not a
      child combinator.

### Phase 7 — Search + Explore ✅ 2026-08-14
- [x] Pagefind via repo-local `.venv` (uv, `pagefind[extended]==1.5.2` —
      pinned to the exact version astro-pagefind used), run against dist/
      post-build. **The planned bootstrap replication was unnecessary**:
      the pagefind CLI ships the identical component set (including
      `<pagefind-config>`) at `/pagefind/pagefind-component-ui.js`, so the
      search pages just load that + `pagefind-component-ui.css` — always
      version-matched to the generated index (scottwillsey's route). The
      156KB vendored bundle in migrate/reference/ stays as reference only.
- [x] `search_component` Tera component (markup identical to Search.astro's
      output); real /search/ template with the autofocus inline module
      verbatim; search box added to /404.html; `.search-page` p rule +
      explore CSS added to fwb.css.
- [x] `/explore/`: markup ported from explore.astro, the COMPILED inline
      module lifted verbatim from the baseline build (source was TS),
      noindex/nofollow meta preserved. Dev proxy: decided prod-only — no
      /api shim in dev.sh; /explore fully works only in production/preview.
- [x] Parity: identical pagefind 1.5.2 run against dist/ and a baseline
      copy — 463 pages both, words 44216 vs 44252 (0.08% delta = the
      accepted transcript-45/alias divergences); **filter values and
      counts IDENTICAL** (beer 127 / coffee 74 / episode 202 / tea 13 /
      transcript 97 — no "water" value in either, matching the old
      water-exclusion rule) and 4 test queries return identical result
      counts. Visual: /explore and /404 pixel-identical (≤0.05%), /search
      0.00% at desktop; the mobile screenshot showed an empty filter pane
      on the new tree but that's a headless virtual-time race — a real
      browser session at mobile width populates all 5 values (verified
      via devtools).

### Phase 8 — Cutover ✅ 2026-08-14 (deploy pending)
- [x] `migrate/postbuild.py`: strips the /explore/ `<url>` entry from
      `sitemap.xml` (reported in its output line).
- [x] `static/.htaccess`: 404 + cache rules kept; `^/_astro/` immutable
      rule replaced with `^/processed_images/`; `pf_*` rules kept.
- [x] `build.sh` (serve-guard → trash-mv dist → convert.py → zola build
      --force → postbuild.py → pagefind — tested end-to-end), `dev.sh`
      (src/ poll loop, `--extra-watch-path data`, cleanup traps; NO /api
      shim — prod-only decided in Phase 7), `preview.sh`, `deploy.sh`
      (build.sh + existing `~/Scripts/Sites/fwb/deploy.sh`, rsync side
      unchanged).
- [x] Deleted `astro/` (package.json, lockfile, configs,
      check-overrides.mjs, githooks), root node_modules (4.8 GB),
      `.eslintrc.js`/`.prettierrc.mjs`/`.prettierignore`, `.astro/` cache,
      and the `static/images/player/` orphans.
- [ ] Retire the pipeline's npm couplings (audited 2026-08-10, see the
      pipeline-contract section — the full list):
      - [x] `nanoid` shell-out replaced with inline Python (secrets,
        same 21-char URL-safe alphabet). The binary was already absent
        from PATH, so the shell-out was broken anyway.
      - [x] Dashboard "Deploy Site" now runs the new wrapper
        `~/Scripts/Sites/fwb/fwb-deploy-site.sh` → this repo's deploy.sh
        (build+rsync, scottwillsey's deploy-site.sh pattern) instead of
        raw-rsyncing a possibly-stale dist.
      - [x] Retrobatch verified: path string is `static/images/brews`
        (the lone "public/" match is a stale macOS bookmark blob, and
        bookmarks track moved dirs anyway); stale comments in
        fwb-create-episode.sh + fwb-new-episode/main.py updated, 8-bit
        PNG constraint noted in the pipeline comments.
      - [x] Docs updated (FWB_WORKFLOW.md key-paths row + Astro-build
        mention, FWB_VECTOR_SEARCH.md deploy-chain note).
- [ ] Verify the pipeline end-to-end after the above (the fake-episode-102
      rehearsal in post-cutover hardening covers this): it writes
      `src/content/` + `src/data/`, dev.sh picks it up, build.sh publishes
      it, `fwb-index-embeddings` still indexes (reads `src/` directly,
      never `dist/` — untouched by the cutover).
- [x] README rewritten (Zola workflow, script table, generated-tree
      warnings, image constraints); the `_index.md` hand-maintained
      comments were already in place.
- [x] Final parity sweep from a clean `./build.sh`: URL diff (only the
      accepted sitemap rename + robots.txt), pages (known accepted set
      only), feed (0 mismatches), visual spot-check (episode 0.01%,
      brews list 0.09%, search 0.00%).
- [ ] Deploy (`./deploy.sh`) — awaiting go-ahead.

### Post-cutover hardening (budget for it)
scottwillsey needed ~9 follow-up commits once the site was used in anger
(dev-loop wedging, watch paths, stale comments). Expect the same class of
issues here, plus one FwB-specific rehearsal: **publish a fake episode 102
end-to-end through the pipeline on a branch before the next real episode.**

---

## Post-migration tasks (after cutover, not part of the migration)

0. **Feed cleanups** (each breaks strict parity, so after cutover only,
   ideally spaced out): fix the 5 W3C-validator quirks (see Phase 4) and
   the relative `../../assets/images/` srcs inside 9 episodes'
   `descriptionRSS` (feed readers can't resolve them — they've been
   broken on the live feed all along). descriptionRSS lives in `src/`,
   so that one is a careful pipeline-format-preserving edit.
1. ✅ **Transcripts 53/97/98/99 backfilled** (2026-08-14, before deploy):
   `~/Scripts/Sites/fwb/fwb-backfill-transcripts.py` (new, reusable)
   downloads the published MP3s, transcribes with Scribe v2 + keyterms
   from the YT CORRECTIONS.md, maps diarized speakers (auto-detection +
   evidence printout; ep 99 has waitress Kim as a third voice), and
   writes the pages via fwb-transcript/main.py's own helpers. Speaker
   mappings human-verified by Scott 2026-08-14; glossary review pass
   fixed two "Friends with Bruce" openers. Transcript list grew to 6
   pages; has_transcript flipped on all four episode pages.

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
