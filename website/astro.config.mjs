// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://netbudget.app",
  integrations: [tailwind({ applyBaseStyles: false })],
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en", "es", "pt", "de", "it", "ar", "ja"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    format: "directory",
  },
});
