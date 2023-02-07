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
      sizes: "250px",
      linkToSrc: true,
      eleventyImageConfig: {
        widths: ["auto", 600, 1000, 1400],
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
