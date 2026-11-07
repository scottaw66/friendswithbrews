# Friends with Brews

[Friends With Brews podcast](https://friendswithbrews.com)

**_"Two friends, two brews, one podcast, many topics."_**

All content &copy; 2021&ndash;2026 by Friends with Brews

Pour a cold one (or two) or a hot one (or two) and enjoy!!!

[🌎](https://friendswithbrews.com) ・ [🍻](https://friendswithbrews.com/brews/)

## License

Split license — see [LICENSE](LICENSE) for the exact boundaries:

- **Code** (templates, build scripts, `tools/` and `migrate/` tooling, site CSS/JS): MIT.
- **Content** (episodes, transcripts, show notes, artwork, brew photos, and
  the episode/brew data files): &copy; Friends with Brews, **all rights
  reserved**. It's in the repo because the site is built from it, not as an
  invitation to republish it or train on it.

## How this site is built

Static site built with **Zola** (migrated from Astro 2026-08-14 — see
`ZOLA-MIGRATION.md` for the full story). No npm, no Node, no JS build step.

- `./dev.sh` — writing mode: live reload at http://127.0.0.1:1111; edits
  under `content/`, `data/` and `src/assets/` re-run prebuild as you save.
  (/search needs a pagefind index from a prior build; /explore only works in
  production.)
- `./preview.sh` — full production build served at http://127.0.0.1:1818.
- `./build.sh` — build only (prebuild → zola → postbuild → pagefind → `dist/`).
- `./deploy.sh` — build + rsync to production (also ships the vector DB).

One-time setup on a fresh clone:

```sh
brew install zola
uv venv --python /opt/homebrew/bin/python3 .venv && uv pip install --python .venv/bin/python "pagefind[extended]"
```

## Where things live

There is one authoring tree, and it is what Zola reads (since 2026-11-06;
before that a YAML `src/content` + `src/data` tree was converted into
`content/` and `data/` on every build — see ZOLA-MIGRATION.md).

- `content/<n>.md` — the episode pages, and `content/transcripts/<n>.md` the
  transcripts, as markdown with **TOML frontmatter** (`+++ … +++`). Written by
  the episode pipeline in `~/Developer/Sites/website-scripts/fwb/` and edited
  by hand for fixes. The pipeline writes the source fields; `tools/prebuild.py`
  fills in the derived `[extra]` fields (`duration`, `display_date`,
  `rfc2822_date`, `has_transcript`). In-body images are
  `{{<content_image path={"…"} alt={"…"} />}}` calls; a literal `{{`/`{%` in
  prose must be wrapped in `{% raw %}…{% endraw %}` because Zola 0.23 renders
  content as Tera.
- `data/brews.json` — **the one brews file** (the pipeline adds entries, Scott
  edits descriptions and ratings in place); `data/reviews.json` and
  `data/site.json` are hand-maintained.
- `content/listpages/` and `content/bottle/` — **generated** by
  `tools/prebuild.py` on every build (pagination stubs; one bottle page per
  brew in `data/brews.json`). Every generated file says so in its first line;
  don't edit them. The `_index.md` files and `content/pages/` are
  hand-maintained.
- `src/assets/images/` — the image store `resize_image` reads (brew photos,
  episode images, hosts). `src/srt/` — the SRT files for episodes up to 56,
  read only by the search indexer for transcript timestamps. Nothing else
  lives under `src/`.
- `tools/prebuild.py` (zero-dependency Python, build step 1) refreshes the
  generated files and derived fields in place, writes only what changed, and
  fails the build on bad frontmatter, a missing brew image, YAML `---`
  frontmatter, an unprotected Tera token or Astro-era image syntax.
  `tools/postbuild.py` post-processes the feed and sitemap.
- `templates/` — Zola/Tera templates; `templates/icons.html` is generated
  by `migrate/gen-icons.py`.
- `static/` — served as-is (CSS, fonts, images, .htaccess).
- `migrate/` — the parity tooling and reference files from the Astro
  migration (`parity.py`, `gen-icons.py`, `baseline-urls.txt`, `reference/`).

## Image constraints (brew photos)

**PNGs must be 8-bit** (`rgb24`/`rgba`). Zola's webp encoder fails on 16-bit
PNGs (Astro's sharp used to tolerate them). Retrobatch already writes 8-bit;
before adding a photo by hand, check with `file photo.png` — if it says
`16-bit`, normalize it:

```sh
ffmpeg -i in.png -pix_fmt rgb24 out.png   # no transparency
ffmpeg -i in.png -pix_fmt rgba out.png    # has transparency (keeps alpha)
```

Photos go in `src/assets/images/brews/` (resized at build) **and**
`static/images/brews/` (full-size click-through originals).
