// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: "https://github.com/kdevgado/home-organisers-website",
  base: "/home-organisers-website/", 
  output: "static",
  trailingSlash: "always",
});