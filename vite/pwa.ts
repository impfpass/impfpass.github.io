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
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,txt}"],
    cleanupOutdatedCaches: true,
    // Die PC-App (Plan 3) liegt unter /import/ und hat eine eigene Seite.
    navigateFallbackDenylist: [/^\/import\//],
    // Neue Version sofort aktivieren und die offenen Seiten übernehmen. Mit
    // injectRegister "script" setzt das Plugin das nicht selbst. Unbedenklich,
    // weil beide Seiten (Handy-App und PC-App unter /import/) ihre Teile beim
    // Start laden und nichts nachgeladen wird.
    skipWaiting: true,
    clientsClaim: true,
  },
};
