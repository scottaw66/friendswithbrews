import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://friendswithbrews.com/",
  integrations: [ icon(), pagefind(), sitemap(),],
  vite: {
    server: {
      // Dev-only: lets /explore hit the live search API without CORS.
      // Production is same-origin via the Apache /api/ proxy.
      proxy: {
        "/api": {
          target: "https://friendswithbrews.com",
          changeOrigin: true,
        },
      },
    },
  },
});
