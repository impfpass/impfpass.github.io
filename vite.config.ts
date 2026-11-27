import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { appVersionDefine } from "./vite/appVersion.ts";
import { bootFallbackPlugin } from "./vite/bootFallback.ts";
import { cspPlugin } from "./vite/csp.ts";
import { importPagePlugin } from "./vite/importPage.ts";
import { pwaOptions } from "./vite/pwa.ts";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA(pwaOptions),
    cspPlugin(),
    bootFallbackPlugin(),
    importPagePlugin(),
  ],
  define: appVersionDefine(),
  build: {
    // Zwei Seiten: Handy-App und PC-App unter /import/
    rolldownOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        import: path.resolve(import.meta.dirname, "import/index.html"),
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
