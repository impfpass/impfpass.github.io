import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { appVersionDefine } from "./vite/appVersion.ts";
import { bootFallbackPlugin } from "./vite/bootFallback.ts";
import { cspPlugin } from "./vite/csp.ts";
import { pwaOptions } from "./vite/pwa.ts";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA(pwaOptions),
    cspPlugin(),
    bootFallbackPlugin(),
  ],
  define: appVersionDefine(),
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
