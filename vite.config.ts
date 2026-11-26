import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { appVersionDefine } from "./vite/appVersion.ts";
import { cspPlugin } from "./vite/csp.ts";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Registrierung als eigene Datei, keine Inline-Skripte (CSP)
      injectRegister: "script",
      includeAssets: [
        "favicon.ico",
        "icon.svg",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        id: "/",
        name: "ImpfPass",
        short_name: "ImpfPass",
        description: "Dein Impfpass auf dem Handy",
        lang: "de",
        start_url: "/#/",
        scope: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
      },
    }),
    cspPlugin(),
  ],
  define: appVersionDefine(),
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
