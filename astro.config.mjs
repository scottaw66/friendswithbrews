import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import { remarkEleventyImage } from "astro-image-multitool";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  experimental: {
    contentCollections: true,
  },
  site: "https://friendswithbeer.com/",
  trailingSlash: "ignore",
  outDir: "dist",
  integrations: [
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
      eleventyImageConfig: {
        widths: ["auto", 600, 900, 1200],
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
