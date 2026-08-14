# Friends with Brews

[Friends With Brews podcast](https://friendswithbrews.com)

**_"Two friends, two brews, one podcast, many topics."_**

All content &copy; 2023 by Scott Willsey

Pour a cold one (or two) or a hot one (or two) and enjoy!!!

[🌎](https://friendswithbrews.com) ・ [🐘](https://appdot.net/@friendswbrews) ・ [🍻](https://friendswithbrews.com/brews/)

## Image constraints (brew photos)

**PNGs must be 8-bit** (`rgb24`/`rgba`). Zola's webp encoder fails on 16-bit
PNGs (Astro's sharp used to tolerate them). Before adding a new brew photo,
check with `file photo.png` — if it says `16-bit`, normalize it:

```sh
ffmpeg -i in.png -pix_fmt rgb24 out.png   # no transparency
ffmpeg -i in.png -pix_fmt rgba out.png    # has transparency (keeps alpha)
```

Photos go in `src/assets/images/brews/` (resized at build) **and**
`static/images/brews/` (full-size click-through originals).

## Package management

This site uses **npm**.

- Install: `npm install`
- Check for dependency updates: `npm run ncu` (to apply them: `npm run ncu -- -u` — note the `--` — then `npm install`)
