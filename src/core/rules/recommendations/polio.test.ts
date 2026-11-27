import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { polioRule } from "./polio";

const p = person("1967-03-01");

describe("polioRule", () => {
  it("Polio: ohne Eintrag ist die Grundimmunisierung jetzt fällig (Epid Bull 4/2026, S. 18)", () => {
    expect(run(polioRule, { person: p, today: "2026-11-27" })).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 3 },
      reason: { kind: "catch_up", given: 0, total: 3 },
    });
    expect(polioRule.id).toBe("polio");
    expect(polioRule.diseases).toEqual(["polio"]);
    expect(polioRule.source).toMatchObject({
      page: 18,
      section: "Tab. 2, Poliomyelitis",
    });
  });

  it("Polio: 2. Dosis frühestens 1 Monat nach der 1., 3. Dosis frühestens 6 Monate nach der 2. (Epid Bull 4/2026, S. 68)", () => {
    const one = [shot("2026-10-31", "ipv-merieux")];
    expect(
      run(polioRule, {
        person: p,
        vaccinations: one,
        today: "2026-11-29",
        leadMonths: 0,
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2026-11-30",
      latestDate: null,
      timing: "follow_up",
      dose: { number: 2, of: 3 },
      reason: { kind: "catch_up", given: 1, total: 3 },
    });
    expect(
      run(polioRule, {
        person: p,
        vaccinations: one,
        today: "2026-11-30",
        leadMonths: 0,
      }).status,
    ).toBe("due");
    const two = [
      shot("2026-01-31", "ipv-merieux"),
      shot("2026-02-28", "ipv-merieux"),
    ];
    expect(
      run(polioRule, {
        person: p,
        vaccinations: two,
        today: "2026-11-27",
        leadMonths: 0,
      }),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-08-28",
      latestDate: null,
      dose: { number: 3, of: 3 },
      reason: { kind: "catch_up", given: 2, total: 3 },
    });
  });

  it("Polio: nach 3 Dosen einmalige Auffrischung (Epid Bull 4/2026, S. 68)", () => {
    const vs = [
      shot("1975-05-01", "ipv-merieux"),
      shot("1975-06-01", "ipv-merieux"),
      shot("2016-11-27", "ipv-merieux"),
    ];
    const at = (today: string) =>
      run(polioRule, { person: p, vaccinations: vs, today });
    expect(at("2026-05-26").status).toBe("protected");
    expect(at("2026-05-27").status).toBe("soon");
    expect(at("2026-11-26").status).toBe("soon");
    expect(at("2026-11-27")).toMatchObject({
      status: "overdue",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "series", given: 3, total: 4 },
      source: { page: 68, section: "Tab. 11E" },
    });
  });

  it("Polio: vollständig nach Grundimmunisierung und einer Auffrischung (Epid Bull 4/2026, S. 18)", () => {
    const vs = [
      shot("1975-05-01", "ipv-merieux"),
      shot("1975-06-01", "ipv-merieux"),
      shot("1976-01-01", "ipv-merieux"),
      shot("2016-11-27", "ipv-merieux"),
    ];
    expect(
      run(polioRule, { person: p, vaccinations: vs, today: "2046-01-01" }),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      latestDate: null,
      dose: null,
      reason: { kind: "complete" },
    });
  });

  it("Polio: Schluckimpfung (historisch) und Kombi-Impfstoffe zählen (Epid Bull 4/2026, S. 18)", () => {
    const vs = [
      shot("1975-05-01", "polio-oral"),
      shot("1975-06-01", "ipv-merieux"),
      shot("2016-11-27", "boostrix-polio"),
    ];
    expect(
      run(polioRule, { person: p, vaccinations: vs, today: "2026-11-27" }),
    ).toMatchObject({
      dueDate: "2026-11-27",
      reason: { kind: "series", given: 3, total: 4 },
    });
  });
});
