import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { tdNextDate, tdRule } from "./td";
import type { RuleContext } from "../types";

const p = person("1967-03-01");
const boosterShots = () => [
  shot("1990-01-01", "td-pur", "year"),
  shot("1991-01-01", "td-pur", "year"),
  shot("2016-11-27", "boostrix"),
];

describe("tdRule", () => {
  it("Td: ohne Eintrag ist die Grundimmunisierung jetzt fällig (Epid Bull 4/2026, S. 18)", () => {
    const result = run(tdRule, { person: p, today: "2026-11-27" });
    expect(result).toMatchObject({
      status: "due",
      dueDate: null,
      latestDate: null,
      dose: { number: 1, of: 3 },
      reason: { kind: "catch_up", given: 0, total: 3 },
    });
    expect(tdRule.id).toBe("td");
    expect(tdRule.diseases).toEqual(["tetanus", "diphtheria"]);
    expect(tdRule.source).toMatchObject({
      page: 18,
      section: "Tab. 2, Tetanus",
    });
  });

  it("Td: nur eine dokumentierte Dosis ergibt die 2. Dosis der Grundimmunisierung (Epid Bull 4/2026, S. 61)", () => {
    expect(
      run(tdRule, {
        person: p,
        vaccinations: [shot("2020-05-04", "td-immun")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "overdue",
      dueDate: "2020-06-01",
      latestDate: "2020-06-29",
      timing: "follow_up",
      dose: { number: 2, of: 3 },
      reason: { kind: "catch_up", given: 1, total: 3 },
    });
  });

  it("Td: 2. Dosis frühestens nach 4 Wochen, spätestens nach 8 Wochen, Grenztage (Epid Bull 4/2026, S. 11)", () => {
    const vs = [shot("2026-10-01", "td-immun")];
    const at = (today: string) =>
      run(tdRule, { person: p, vaccinations: vs, today, leadMonths: 0 }).status;
    expect(at("2026-10-28")).toBe("future");
    expect(at("2026-10-29")).toBe("due");
    expect(at("2026-11-26")).toBe("due");
    expect(at("2026-11-27")).toBe("overdue");
  });

  it("Td: 3. Dosis 6 bis 12 Monate nach der 2. (Epid Bull 4/2026, S. 11)", () => {
    const vs = [shot("2026-01-10", "td-immun"), shot("2026-02-10", "td-immun")];
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-08-10",
      latestDate: "2027-02-10",
      dose: { number: 3, of: 3 },
      reason: { kind: "catch_up", given: 2, total: 3 },
    });
  });

  it("Td: Auffrischung genau 10 Jahre nach der letzten Dosis (Epid Bull 4/2026, S. 68)", () => {
    const vs = boosterShots();
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-11-26" }).status,
    ).toBe("soon");
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-11-27" }),
    ).toMatchObject({
      status: "overdue",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: null,
      reason: { kind: "booster", lastDate: "2016-11-27", intervalYears: 10 },
      source: { page: 68, section: "Text zu Tab. 11E" },
    });
  });

  it("Td: Vorlauf 6 Monate, Tag vor und am Beginn (Epid Bull 4/2026, S. 68)", () => {
    const vs = boosterShots();
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-05-26" }).status,
    ).toBe("protected");
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-05-27" }).status,
    ).toBe("soon");
  });

  it("Td: reiner Tetanus-Impfstoff zählt als Dosis (Epid Bull 4/2026, S. 18)", () => {
    const vs = [shot("2020-05-04", "tetanol")];
    expect(
      run(tdRule, { person: p, vaccinations: vs, today: "2026-11-27" }),
    ).toMatchObject({ dose: { number: 2, of: 3 }, dueDate: "2020-06-01" });
  });

  it("Td: tdNextDate liefert null ohne Dosis, den Folgetermin in der Serie und den Auffrischtermin (Epid Bull 4/2026, S. 68)", () => {
    const ctx = (vs: RuleContext["vaccinations"]): RuleContext => ({
      person: p,
      vaccinations: vs,
      decision: undefined,
      today: "2026-11-27",
      leadMonths: 6,
      seasonDay: "09-01",
    });
    expect(tdNextDate(ctx([]))).toBeNull();
    expect(tdNextDate(ctx([shot("2020-05-04", "td-immun")]))).toBe(
      "2020-06-01",
    );
    expect(tdNextDate(ctx(boosterShots()))).toBe("2026-11-27");
  });
});
