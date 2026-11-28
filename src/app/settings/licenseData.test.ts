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

it("scheitert, wenn die Datei fehlt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("", { status: 404 })),
  );
  await expect(loadLicenseSummary()).rejects.toThrow();
});
