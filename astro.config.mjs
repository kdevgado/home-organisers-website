// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://homeorg.com.au",
  output: "static",
  compressHTML: true,
  trailingSlash: 'never',
  integrations: [sitemap({ filter: (page) => !/\/(competition|404)\/?$/.test(new URL(page).pathname) })]
});
