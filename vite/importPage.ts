import type { Plugin } from "vite";

export const IMPORT_MANIFEST = "/import/manifest.webmanifest";

const MAIN_MANIFEST_LINK =
  /\s*<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?>/;

/** Entfernt den Manifest-Link der Handy-App aus dem HTML der PC-App. */
export function removeMainManifestLink(html: string): string {
  return html.replace(MAIN_MANIFEST_LINK, "");
}

/**
 * vite-plugin-pwa hängt an jede Seite den Link auf /manifest.webmanifest.
 * Die PC-App unter /import/ hat ein eigenes Manifest und soll nur dieses
 * haben, sonst ließe sie sich nicht getrennt installieren.
 */
export function importPagePlugin(): Plugin {
  return {
    name: "impfpass-import-page",
    // Beides ist nötig, geprüft mit `npm run build`: vite-plugin-pwa fügt den
    // Link mit order "post" ein. Ohne enforce "post" oder ohne order "post"
    // läuft dieser Hook davor, und der Link bleibt in /import/index.html.
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html: string, ctx) {
        if (!ctx.path.startsWith("/import/")) return html;
        return removeMainManifestLink(html);
      },
    },
  };
}
