import { describe, expect, it } from "vitest";
import { person, shot } from "@/test/rules";
import { evaluate } from "./evaluate";
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
      "influenza",
      "covid19",
      "pneumococcal",
      "zoster",
      "rsv",
      "tbe",
    ]);
    expect(new Set(ids).size).toBe(12);
    for (const rule of RULEBOOK.rules) {
      expect(rule.source.url).toMatch(/^https:\/\//);
      expect(rule.source.edition).not.toBe("");
    }
    expect(RULEBOOK.sources).toHaveLength(5);
    for (const s of RULEBOOK.sources) {
      expect(s.label).not.toBe("");
      expect(s.url).toMatch(/^https:\/\//);
    }
    expect(RULEBOOK.changes).toEqual([]);
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
    expect(recs).toHaveLength(12);
    expect(status).toMatchObject({
      td: "overdue",
      pertussis: "due",
      zoster: "soon",
      influenza: "due",
      covid19: "future",
      rsv: "future",
      mmr: "not_applicable",
      tbe: "due",
    });
  });
});
