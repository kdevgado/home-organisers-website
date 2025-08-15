// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: "https://kdevgado.github.io",
  base: "/home-organisers-website/",
  output: "static",
  trailingSlash: "always",
});