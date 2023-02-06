import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import { remarkEleventyImage } from "astro-remark-eleventy-image";
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
  },
  vite: {
    ssr: {
      external: ["svgo"],
    },
  },
});
