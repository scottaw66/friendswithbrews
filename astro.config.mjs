import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import mdx from "@astrojs/mdx";
import remarkGfm from "remark-gfm";
import sitemap from "@astrojs/sitemap";
import solid from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  site: "https://friendswithbeer.com/",
  trailingSlash: "ignore",
  outDir: "dist",
  integrations: [sitemap(), image(), mdx(), solid()],
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
