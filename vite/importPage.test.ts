import { describe, expect, it } from "vitest";
import type { IndexHtmlTransformContext } from "vite";
import {
  IMPORT_MANIFEST,
  importPagePlugin,
  removeMainManifestLink,
} from "./importPage.ts";

const page = `<head>
<link rel="manifest" href="${IMPORT_MANIFEST}" />
<link rel="manifest" href="/manifest.webmanifest">
</head>`;

describe("removeMainManifestLink", () => {
  it("entfernt den Link der Handy-App und behält den eigenen", () => {
    const out = removeMainManifestLink(page);
    expect(out.match(/rel="manifest"/g)).toHaveLength(1);
    expect(out).toContain(IMPORT_MANIFEST);
    expect(out).not.toContain('"/manifest.webmanifest"');
  });

  it("lässt eine Seite ohne den Link unverändert", () => {
    const only = `<link rel="manifest" href="${IMPORT_MANIFEST}" />`;
    expect(removeMainManifestLink(only)).toBe(only);
  });
});

describe("importPagePlugin", () => {
  function transform(path: string): string {
    const hook = importPagePlugin().transformIndexHtml;
    if (typeof hook !== "object" || hook === null || !("handler" in hook)) {
      throw new Error("transformIndexHtml has no handler");
    }
    const ctx = { path } as IndexHtmlTransformContext;
    return hook.handler.call({} as never, page, ctx) as string;
  }

  it("entfernt den Link der Handy-App nur aus Seiten unter /import/", () => {
    expect(transform("/import/index.html")).not.toContain(
      '"/manifest.webmanifest"',
    );
    expect(transform("/import/")).not.toContain('"/manifest.webmanifest"');
  });

  it("lässt die Seite der Handy-App und andere Pfade unverändert", () => {
    expect(transform("/index.html")).toBe(page);
    expect(transform("/important.html")).toBe(page);
  });
});
