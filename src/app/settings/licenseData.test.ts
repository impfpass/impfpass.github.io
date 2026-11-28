import { afterEach, expect, it, vi } from "vitest";
import type { LicenseSummary } from "@/core/licenses";
import { loadLicenseSummary, loadLicenseTexts } from "./licenseData";

const SUMMARY: LicenseSummary = {
  packages: 1,
  projects: [{ name: "React", licenses: ["MIT"] }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

it("lädt die Übersicht von der eigenen Seite", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(SUMMARY)));
  vi.stubGlobal("fetch", fetchMock);
  expect(await loadLicenseSummary()).toEqual(SUMMARY);
  expect(fetchMock).toHaveBeenCalledWith("/third-party-licenses.json");
});

it("lädt die Lizenztexte von der eigenen Seite", async () => {
  const fetchMock = vi.fn(async () => new Response("MIT License"));
  vi.stubGlobal("fetch", fetchMock);
  expect(await loadLicenseTexts()).toBe("MIT License");
  expect(fetchMock).toHaveBeenCalledWith("/third-party-licenses.txt");
});

it("scheitert, wenn die Textdatei fehlt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 404 })),
  );
  await expect(loadLicenseTexts()).rejects.toThrow();
});

it.each([
  ["ohne Projekte", { packages: 1 }],
  [
    "mit Lizenz als Text statt Liste",
    { packages: 1, projects: [{ name: "React", licenses: "MIT" }] },
  ],
  [
    "mit Projekt ohne Namen",
    { packages: 1, projects: [{ licenses: ["MIT"] }] },
  ],
  ["als Liste", []],
])(
  "scheitert bei einer Übersicht in unerwartetem Format (%s)",
  async (_label, data) => {
    // Etwa nach einer Formatänderung: Eine noch offene alte Seite bekommt vom
    // neuen Service Worker die neue Datei. Dann lieber die Meldung als eine
    // leere Seite.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(data))),
    );
    await expect(loadLicenseSummary()).rejects.toThrow();
  },
);

it("scheitert, wenn statt der Textdatei eine HTML-Seite kommt", async () => {
  // Der Entwicklungsserver antwortet auf unbekannte Pfade mit index.html.
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response("<!doctype html><html></html>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    ),
  );
  await expect(loadLicenseTexts()).rejects.toThrow();
});

it("scheitert, wenn die Datei fehlt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 404 })),
  );
  await expect(loadLicenseSummary()).rejects.toThrow();
});
