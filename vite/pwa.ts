import type { VitePWAOptions } from "vite-plugin-pwa";

/** Einstellungen für vite-plugin-pwa: Manifest und Service Worker. */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "autoUpdate",
  // Registrierung als eigene Datei, keine Inline-Skripte (CSP)
  injectRegister: "script",
  includeAssets: ["favicon.ico", "icon.svg", "apple-touch-icon-180x180.png"],
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
    // Neue Version sofort aktivieren und die offenen Seiten übernehmen. Mit
    // injectRegister "script" setzt das Plugin das nicht selbst. Unbedenklich,
    // weil der Build ein einziges JS-Bündel ohne nachgeladene Teile ist.
    skipWaiting: true,
    clientsClaim: true,
  },
};
