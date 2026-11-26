import { expect, it } from "vitest";
import { cspPlugin, CSP } from "./csp";

it("wirkt nur beim Build", () => {
  expect(cspPlugin().apply).toBe("build");
});

it("setzt die Content-Security-Policy als erstes Element in den Kopf", () => {
  // Der Hook braucht keinen Plugin-Kontext und keine Argumente.
  const hook = cspPlugin().transformIndexHtml as unknown as () => unknown;
  const tags = hook();
  expect(tags).toEqual([
    {
      tag: "meta",
      attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
      injectTo: "head-prepend",
    },
  ]);
});

it("erlaubt nur eigene Quellen und keine Inline-Skripte", () => {
  expect(CSP).toBe(
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
  );
});
