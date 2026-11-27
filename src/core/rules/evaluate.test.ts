import type { Decision } from "@/core/model";
import { person, shot } from "@/test/rules";
import { evaluate } from "./evaluate";
import type { Rule, Rulebook, SourceRef } from "./types";

const source: SourceRef = {
  edition: "Test 1/2026",
  date: "2026-01-01",
  section: "Test",
  page: null,
  url: "https://example.org/",
};
// Liefert immer "due"; die Zahl der berücksichtigten Impfungen steht im Grund.
const dueRule: Rule = {
  id: "td",
  diseases: ["tetanus", "diphtheria"],
  source,
  evaluate: (ctx) => ({
    status: "due",
    dueDate: null,
    latestDate: null,
    dose: null,
    timing: "normal",
    reason:
      ctx.vaccinations.length > 0
        ? { kind: "series", given: ctx.vaccinations.length, total: 9 }
        : { kind: "booster", lastDate: "2000-01-01", intervalYears: 10 },
  }),
};
const naRule: Rule = {
  id: "tbe",
  diseases: ["tbe"],
  source,
  evaluate: () => ({
    status: "not_applicable",
    dueDate: null,
    latestDate: null,
    dose: null,
    timing: "normal",
    reason: { kind: "none" },
  }),
};
const book: Rulebook = {
  version: "2026-01-01.1",
  edition: "Test",
  sources: [],
  changes: [],
  rules: [dueRule, naRule],
};
const opts = { leadMonths: 6, seasonDay: "09-01" };
const decision = (
  recommendationId: string,
  kind: Decision["kind"],
): Decision => ({
  personId: "p1",
  recommendationId,
  kind,
  at: "2026-11-01T10:00:00.000Z",
});

describe("evaluate", () => {
  it("unter 18 gibt es keine Empfehlungen, ab dem 18. Geburtstag schon", () => {
    expect(
      evaluate(person("2008-11-28"), [], [], "2026-11-27", book, opts),
    ).toEqual([]);
    expect(
      evaluate(person("2008-11-27"), [], [], "2026-11-27", book, opts),
    ).toHaveLength(2);
  });

  it("ergänzt id, diseases und source der Regel in der Reihenfolge des Regelwerks", () => {
    const result = evaluate(
      person("1980-01-01"),
      [],
      [],
      "2026-11-27",
      book,
      opts,
    );
    expect(result.map((r) => r.id)).toEqual(["td", "tbe"]);
    expect(result[0].diseases).toEqual(["tetanus", "diphtheria"]);
    expect(result[0].source).toBe(source);
  });

  it("„Möchte ich nicht“ und „Nicht nötig“ überschreiben den Status, „trifft nicht zu“ bleibt", () => {
    const p = person("1980-01-01");
    const declined = evaluate(
      p,
      [],
      [decision("td", "declined"), decision("tbe", "declined")],
      "2026-11-27",
      book,
      opts,
    );
    expect(declined.map((r) => r.status)).toEqual([
      "declined",
      "not_applicable",
    ]);
    expect(declined[0].reason).toEqual({
      kind: "booster",
      lastDate: "2000-01-01",
      intervalYears: 10,
    });
    const notNeeded = evaluate(
      p,
      [],
      [decision("td", "not_needed")],
      "2026-11-27",
      book,
      opts,
    );
    expect(notNeeded.map((r) => r.status)).toEqual([
      "not_needed",
      "not_applicable",
    ]);
  });

  it("Arzt-Entscheidungen ändern den Status nicht selbst", () => {
    const result = evaluate(
      person("1980-01-01"),
      [],
      [decision("td", "doctor_recommends")],
      "2026-11-27",
      book,
      opts,
    );
    expect(result[0].status).toBe("due");
  });

  it("Entscheidungen zu unbekannten Empfehlungen stören nicht", () => {
    const result = evaluate(
      person("1980-01-01"),
      [],
      [decision("gibtsnicht", "declined")],
      "2026-11-27",
      book,
      opts,
    );
    expect(result.map((r) => r.status)).toEqual(["due", "not_applicable"]);
  });

  it("Impfungen anderer Personen und Einträge nach heute zählen nicht", () => {
    const own = shot("2026-11-27", "td-immun");
    const other = { ...shot("2020-01-01", "td-immun"), personId: "p2" };
    const future = shot("2026-11-28", "td-immun");
    const result = evaluate(
      person("1980-01-01"),
      [own, other, future],
      [],
      "2026-11-27",
      book,
      opts,
    );
    expect(result[0].reason).toEqual({ kind: "series", given: 1, total: 9 });
  });
});
