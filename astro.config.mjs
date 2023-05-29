import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import pagefind from "astro-pagefind";
import remarkEleventyImage from "astro-remark-eleventy-image";
import sitemap from "@astrojs/sitemap";

export function customMarkup({ src, sources, width, height, alt }) {
  return `
  
  <picture>
  ${sources}
  <a href="${src}">
  <img
    src="${src}"
    width="${width}"
    height="${height}"
    alt="${alt}"
    loading="lazy"
    decoding="async">
    </a>
   </picture>
   `;
}

// https://astro.build/config
export default defineConfig({
  site: "https://friendswithbeer.com/",
  trailingSlash: "ignore",
  outDir: "dist",
  integrations: [
    pagefind(),
    sitemap(),
    image({
      serviceEntryPoint: "@astrojs/image/sharp",
    }),
    remarkEleventyImage({
      sizes: "(max-width: 300px) 100vw, 300px",
      customMarkup: customMarkup,
      eleventyImageConfig: {
        widths: ["auto", 300, 600, 900, 1200],
        formats: ["avif", "webp", "jpeg"],
        sharpOptions: {
          animated: false,
        },
      },
    }),
  ],
  markdown: {},
  vite: {
    ssr: {
      external: ["svgo", "@11ty/eleventy-img"],
    },
  },
});
