import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import pagefind from "astro-pagefind";
import { remarkEleventyImage } from "astro-image-multitool";
import sitemap from "@astrojs/sitemap";

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
  ],
  markdown: {
    remarkPlugins: [remarkEleventyImage],
    remarkImages: {
      sizes: "(max-width: 300px) 100vw, 300px",
      linkToSrc: true,
      skipWidthAndHeight: true,
      eleventyImageConfig: {
        widths: ["auto", 300, 600, 900, 1200],
        formats: ["avif", "webp", "jpeg"],
        sharpOptions: {
          animated: false,
        },
      },
    },
  },
  vite: {
    ssr: {
      external: ["svgo"],
    },
  },
});
