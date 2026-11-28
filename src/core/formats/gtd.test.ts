import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/core/model";
import { decodeGtdData } from "@/test/gtd";
import {
  encodeGtdData,
  gtdAddress,
  GTD_TEXT_PREFIX,
  gtdLink,
  gtdText,
  normalizeGtdAddress,
  type GtdPayload,
} from "./gtd";

const payload: GtdPayload = {
  format: "impfpass-gtd",
  version: 1,
  created: "2026-11-28T12:00:00.000Z",
  items: [
    {
      ref: "ip-0123456789abcdef",
      op: "upsert",
      title: "Impfung gegen Gürtelrose, 1. Dosis: Termin beim Arzt ausmachen",
      date: "2026-11-28",
      time: null,
      description: "Personen ≥ 60 Jahre, Fällig ab 01.03.2027.",
      checklist: ["Termin beim Arzt ausmachen", "Nach der Impfung eintragen"],
    },
    { ref: "ip-fedcba9876543210", op: "cancel" },
  ],
};

describe("Übergabe als Text", () => {
  it("beginnt mit dem Präfix und enthält nur Base64url-Zeichen", () => {
    const text = gtdText(payload);
    expect(GTD_TEXT_PREFIX).toBe("IMPFPASS-GTD:1:");
    expect(text.startsWith("IMPFPASS-GTD:1:")).toBe(true);
    expect(text.slice(GTD_TEXT_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("lässt sich mit Umlauten und ≥ verlustfrei zurücklesen", () => {
    const data = gtdText(payload).slice(GTD_TEXT_PREFIX.length);
    expect(decodeGtdData(data)).toEqual(payload);
    expect(data).toBe(encodeGtdData(payload));
  });
});

it("packt mit raw DEFLATE ohne zlib-Kopf, wie Version 1 es festlegt", () => {
  // So liest es auch die GTD-App, etwa mit DecompressionStream("deflate-raw").
  const bytes = inflateRawSync(
    Buffer.from(encodeGtdData(payload), "base64url"),
  );
  expect(JSON.parse(bytes.toString("utf8"))).toEqual(payload);
});

describe("Übergabe als Link", () => {
  it("hängt die Daten als Fragment an die Adresse der Übernahmeseite", () => {
    expect(gtdLink("https://gtd.example/de/impfpass", payload)).toBe(
      `https://gtd.example/de/impfpass#impfpass=${encodeGtdData(payload)}`,
    );
  });

  it("ersetzt einen vorhandenen #-Teil der Adresse", () => {
    expect(gtdLink("https://gtd.example/de/impfpass#alt", payload)).toBe(
      `https://gtd.example/de/impfpass#impfpass=${encodeGtdData(payload)}`,
    );
  });
});

describe("normalizeGtdAddress", () => {
  it("nimmt https-Adressen ohne Leerzeichen und ohne #-Teil", () => {
    expect(normalizeGtdAddress("  https://gtd.example/de/impfpass  ")).toBe(
      "https://gtd.example/de/impfpass",
    );
    expect(normalizeGtdAddress("https://gtd.example/x#y")).toBe(
      "https://gtd.example/x",
    );
  });

  it("lässt http nur für den eigenen Rechner zu", () => {
    expect(normalizeGtdAddress("http://localhost:3000/de/impfpass")).toBe(
      "http://localhost:3000/de/impfpass",
    );
    expect(normalizeGtdAddress("http://127.0.0.1:3000/x")).toBe(
      "http://127.0.0.1:3000/x",
    );
    expect(normalizeGtdAddress("http://gtd.example/x")).toBe("invalid");
  });

  it("leer heißt aus, Unvollständiges ist ungültig", () => {
    expect(normalizeGtdAddress("")).toBeNull();
    expect(normalizeGtdAddress("   ")).toBeNull();
    expect(normalizeGtdAddress("gtd.example")).toBe("invalid");
    expect(normalizeGtdAddress("ftp://gtd.example")).toBe("invalid");
  });
});

describe("gtdAddress", () => {
  it("liefert die geprüfte Adresse aus den Einstellungen oder null", () => {
    expect(gtdAddress({ ...DEFAULT_SETTINGS })).toBeNull();
    expect(
      gtdAddress({ ...DEFAULT_SETTINGS, gtdUrl: "https://gtd.example/x" }),
    ).toBe("https://gtd.example/x");
    // Etwa aus einer von Hand bearbeiteten Sicherung.
    expect(gtdAddress({ ...DEFAULT_SETTINGS, gtdUrl: "kaputt" })).toBeNull();
    expect(
      gtdAddress({ ...DEFAULT_SETTINGS, gtdUrl: "javascript:alert(1)" }),
    ).toBeNull();
  });
});
