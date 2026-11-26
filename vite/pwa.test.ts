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
