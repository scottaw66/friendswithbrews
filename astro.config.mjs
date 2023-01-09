import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import remarkGfm from "remark-gfm";
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
    remarkPlugins: [remarkGfm],
    extendDefaultPlugins: true,
  },
  vite: {
    ssr: {
      external: ["svgo"],
    },
  },
});
