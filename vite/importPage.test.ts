import { describe, expect, it } from "vitest";
import { IMPORT_MANIFEST, removeMainManifestLink } from "./importPage.ts";

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
