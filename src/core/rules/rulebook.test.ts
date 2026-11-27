import { describe, expect, it } from "vitest";
import { person, shot } from "@/test/rules";
import { evaluate } from "./evaluate";
import { compareVersions } from "./helpers";
import { RULEBOOK } from "./rulebook";

describe("RULEBOOK", () => {
  it("jede Empfehlungs-ID kommt genau einmal vor, jede Regel hat eine Fundstelle mit URL", () => {
    const ids = RULEBOOK.rules.map((r) => r.id);
    expect(ids).toEqual([
      "td",
      "pertussis",
      "polio",
      "mmr",
      "varicella",
      "hepatitis_b",
      "hepatitis_a",
      "influenza",
      "covid19",
      "pneumococcal",
      "zoster",
      "rsv",
      "tbe",
    ]);
    expect(new Set(ids).size).toBe(13);
    for (const rule of RULEBOOK.rules) {
      expect(rule.source.url).toMatch(/^https:\/\//);
      expect(rule.source.edition).not.toBe("");
    }
    expect(RULEBOOK.sources).toHaveLength(6);
    expect(RULEBOOK.sources.map((s) => s.label)).toContain(
      "Reiseimpfempfehlungen STIKO/DTG 2026, Epid. Bull. 27/2026",
    );
    for (const s of RULEBOOK.sources) {
      expect(s.label).not.toBe("");
      expect(s.url).toMatch(/^https:\/\//);
    }
    expect(compareVersions(RULEBOOK.version, "2026-11-27.1")).toBeGreaterThan(
      0,
    );
    expect(RULEBOOK.changes).toHaveLength(1);
    expect(RULEBOOK.changes[0]).toMatchObject({
      version: RULEBOOK.version,
      ids: ["hepatitis_a", "hepatitis_b"],
      validSince: "2026-07-02",
    });
    expect(RULEBOOK.changes[0].text).not.toBe("");
  });

  it("den Satz „früher bei Erkrankungen“ tragen nur Regeln mit Altersgrenze", () => {
    expect(
      RULEBOOK.rules.filter((r) => r.discussEarlier).map((r) => r.id),
    ).toEqual(["influenza", "covid19", "pneumococcal", "zoster", "rsv"]);
  });

  it("Version hat die Form YYYY-MM-DD.N", () => {
    expect(RULEBOOK.version).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(RULEBOOK.edition).toBe(
      "Epid. Bull. 4/2026, geprüft bis Epid. Bull. 48/2026",
    );
  });

  it("eine Beispielperson ergibt eine plausible Gesamtauswertung", () => {
    const p = person("1960-05-10", { fsme: "yes" });
    const vs = [
      shot("1990-01-01", "td-pur", "year"),
      shot("2000-01-01", "td-pur", "year"),
      shot("2014-03-01", "td-pur"),
      shot("2026-10-01", "shingrix"),
    ];
    const recs = evaluate(p, vs, [], "2026-11-27", RULEBOOK, {
      leadMonths: 6,
      seasonDay: "09-01",
    });
    const status = Object.fromEntries(recs.map((r) => [r.id, r.status]));
    expect(recs).toHaveLength(13);
    expect(status).toMatchObject({
      td: "overdue",
      pertussis: "due",
      zoster: "soon",
      influenza: "due",
      covid19: "future",
      rsv: "future",
      mmr: "not_applicable",
      tbe: "due",
      hepatitis_a: "not_applicable",
    });
  });
});

it("„Möchte ich nicht“ blendet eine angefangene Hepatitis-A-Serie aus", () => {
  const p = person("1985-05-05");
  const recs = evaluate(
    p,
    [shot("2026-03-27", "havrix")],
    [
      {
        personId: p.id,
        recommendationId: "hepatitis_a",
        kind: "declined",
        at: "2026-11-27T10:00:00.000Z",
      },
    ],
    "2026-11-27",
    RULEBOOK,
    { leadMonths: 6, seasonDay: "09-01" },
  );
  expect(recs.find((r) => r.id === "hepatitis_a")?.status).toBe("declined");
});

const ruleSources = import.meta.glob<string>(
  ["./recommendations/*.ts", "!./recommendations/*.test.ts"],
  { query: "?raw", import: "default", eager: true },
);

it("Fundstellen schreiben die STIKO-Kategorie aus („Kategorie S“ statt nur „S“)", () => {
  // Sonst liest sich die Anzeige als „RSV, S, S. 18“.
  const bare = /"[^"]*, [SBI]"/g;
  const offenders = Object.entries(ruleSources).flatMap(([file, code]) =>
    (code.match(bare) ?? []).map((m) => `${file}: ${m}`),
  );
  expect(Object.keys(ruleSources).length).toBeGreaterThan(10);
  expect(offenders).toEqual([]);
});
