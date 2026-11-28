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
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,txt,json}"],
    cleanupOutdatedCaches: true,
    // Die PC-App (Plan 3) liegt unter /import/ und hat eine eigene Seite.
    navigateFallbackDenylist: [/^\/import\//],
    // Neue Version sofort aktivieren und die offenen Seiten übernehmen. Mit
    // injectRegister "script" setzt das Plugin das nicht selbst. Beide Seiten
    // (Handy-App und PC-App unter /import/) laden ihren Code beim Start. Zur
    // Laufzeit holt nur die Handy-App die Lizenzdateien; eine noch offene alte
    // Seite kann dabei die Dateien der neuen Version bekommen. Deshalb prüft
    // src/app/settings/licenseData.ts das Format der Übersicht.
    skipWaiting: true,
    clientsClaim: true,
  },
};
