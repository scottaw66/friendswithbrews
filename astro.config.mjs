import { defineConfig } from "astro/config";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://friendswithbeer.com/",
  integrations: [ icon(), pagefind(), sitemap(),],
});
