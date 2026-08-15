# Friends with Brews

[Friends With Brews podcast](https://friendswithbrews.com)

**_"Two friends, two brews, one podcast, many topics."_**

All content &copy; 2023 by Scott Willsey

Pour a cold one (or two) or a hot one (or two) and enjoy!!!

[🌎](https://friendswithbrews.com) ・ [🐘](https://appdot.net/@friendswbrews) ・ [🍻](https://friendswithbrews.com/brews/)

## How this site is built

Static site built with **Zola** (migrated from Astro 2026-08-14 — see
`ZOLA-MIGRATION.md` for the full story). No npm, no Node, no JS build step.

- `./dev.sh` — writing mode: live reload at http://127.0.0.1:1111; edits
  under `src/` are auto-converted as you save. (/search needs a pagefind
  index from a prior build; /explore only works in production.)
- `./preview.sh` — full production build served at http://127.0.0.1:1818.
- `./build.sh` — build only (convert → zola → postbuild → pagefind → `dist/`).
- `./deploy.sh` — build + rsync to production (also ships the vector DB).

One-time setup on a fresh clone:

```sh
brew install zola
uv venv .venv && uv pip install --python .venv/bin/python "pagefind[extended]"
```

## Where things live

- `src/content/`, `src/data/` — **the authoring tree**, written by the
  episode pipeline in `~/Scripts/Sites/fwb/` (and by hand for fixes).
- `content/`, `data/` — **generated** by `migrate/convert.py` on every
  build; don't edit generated files (the converter owns and prunes them;
  `_index.md` files and `content/pages/` are the hand-maintained
  exceptions, marked as such in their comments).
- `templates/` — Zola/Tera templates; `templates/icons.html` is generated
  by `migrate/gen-icons.py`.
- `static/` — served as-is (CSS, fonts, images, .htaccess).
- `migrate/` — the permanent build steps (convert/postbuild) plus the
  parity tooling from the migration.

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
