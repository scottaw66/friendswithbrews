import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://friendswithbrews.com/",
  redirects: {
    // The transcript list lives under /transcripts/page/N so it can never
    // collide with the per-episode pages at /transcripts/N again.
    "/transcripts": "/transcripts/page/1",
  },
  integrations: [
    icon(),
    pagefind(),
    // /explore is soft-launched: reachable by URL, but not linked, listed,
    // or indexed until it gets a nav home.
    sitemap({ filter: (page) => !page.includes("/explore") }),
  ],
  vite: {
    server: {
      // Dev-only: lets /explore hit the live search API without CORS.
      // Production is same-origin via the Apache /api/ proxy. Set
      // FWB_API_TARGET to test against a locally-run search-server instead.
      proxy: {
        "/api": {
          target: process.env.FWB_API_TARGET || "https://friendswithbrews.com",
          changeOrigin: true,
        },
      },
    },
  },
});
