import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { pwaOptions } from "./pwa";

it("neue Versionen übernehmen sofort, ohne dass alle Fenster geschlossen werden", () => {
  // Mit injectRegister "script" setzt vite-plugin-pwa skipWaiting und
  // clientsClaim nicht von selbst; ohne sie wartet ein Update unbegrenzt.
  expect(pwaOptions.injectRegister).toBe("script");
  expect(pwaOptions.workbox?.skipWaiting).toBe(true);
  expect(pwaOptions.workbox?.clientsClaim).toBe(true);
});

it("Manifest startet die App an der Wurzel im eigenen Fenster", () => {
  expect(pwaOptions.manifest).toMatchObject({
    start_url: "/#/",
    scope: "/",
    display: "standalone",
    lang: "de",
  });
});

it("die PC-App unter /import/ bekommt nicht die Seite der Handy-App", () => {
  // Spec 5: Handy-App unter /, PC-App unter /import/. Ohne Ausnahme liefert
  // der Service Worker für /import/ die index.html der Handy-App aus.
  const denylist = pwaOptions.workbox?.navigateFallbackDenylist ?? [];
  const denied = (path: string) => denylist.some((re) => re.test(path));
  expect(denied("/import/")).toBe(true);
  expect(denied("/import/index.html")).toBe(true);
  expect(denied("/")).toBe(false);
  expect(denied("/impfungen")).toBe(false);
});

it("das Manifest der PC-App hat eine eigene Kennung und den Bereich /import/", () => {
  const manifest = JSON.parse(
    readFileSync("public/import/manifest.webmanifest", "utf-8"),
  ) as unknown;
  expect(manifest).toMatchObject({
    id: "/import/",
    scope: "/import/",
    start_url: "/import/",
    display: "standalone",
  });
});
