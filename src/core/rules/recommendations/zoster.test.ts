import { describe, expect, it } from "vitest";
import { freeShot, person, run, shot } from "@/test/rules";
import { zosterRule } from "./zoster";

describe("zosterRule", () => {
  it("Gürtelrose: Tag vor und am 60. Geburtstag (Epid Bull 4/2026, S. 13)", () => {
    const p = person("1967-03-01");
    expect(run(zosterRule, { person: p, today: "2027-02-28" })).toMatchObject({
      status: "soon",
      dueDate: "2027-03-01",
      reason: { kind: "age", age: 60 },
    });
    expect(run(zosterRule, { person: p, today: "2027-03-01" })).toMatchObject({
      status: "due",
      dueDate: "2027-03-01",
      dose: { number: 1, of: 2 },
      source: { page: 13, section: "Tab. 2, Herpes zoster, S" },
    });
    expect(run(zosterRule, { person: p, today: "2026-08-31" })).toMatchObject({
      status: "future",
    });
  });

  it("Gürtelrose: 2. Dosis frühestens 2, spätestens 6 Monate nach der ersten (Epid Bull 4/2026, S. 68)", () => {
    const p = person("1960-01-01");
    const vaccinations = [shot("2026-01-15", "shingrix")];
    const at = (today: string) =>
      run(zosterRule, { person: p, vaccinations, today });
    expect(at("2026-03-14")).toMatchObject({
      status: "soon",
      dueDate: "2026-03-15",
      latestDate: "2026-07-15",
      dose: { number: 2, of: 2 },
      reason: { kind: "series", given: 1, total: 2 },
      source: { page: 68, section: "Tab. 11E, Fußnote c" },
    });
    expect(at("2026-03-15")).toMatchObject({ status: "due" });
    expect(at("2026-07-15")).toMatchObject({ status: "due" });
    expect(at("2026-07-16")).toMatchObject({ status: "overdue" });
  });

  it("Gürtelrose: zwei Dosen sind vollständig, keine Wiederholung (Epid Bull 4/2026, S. 13)", () => {
    expect(
      run(zosterRule, {
        person: person("1960-01-01"),
        vaccinations: [
          shot("2026-01-15", "shingrix"),
          shot("2026-04-15", "shingrix"),
        ],
        today: "2036-01-01",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
  });

  it("Gürtelrose: Eintrag ohne Impfstoff zählt als Totimpfstoff (Epid Bull 4/2026, S. 68)", () => {
    expect(
      run(zosterRule, {
        person: person("1960-01-01"),
        vaccinations: [freeShot("2026-01-15", ["zoster"])],
        today: "2026-03-15",
      }),
    ).toMatchObject({ status: "due", dose: { number: 2, of: 2 } });
  });

  it("Gürtelrose: Zostavax zählt nicht (Epid Bull 4/2026, S. 25)", () => {
    const p = person("1950-01-01");
    expect(
      run(zosterRule, {
        person: p,
        vaccinations: [shot("2015-05-01", "zostavax")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      dose: { number: 1, of: 2 },
      reason: { kind: "age", age: 60 },
    });
    expect(
      run(zosterRule, {
        person: p,
        vaccinations: [
          shot("2015-05-01", "zostavax"),
          shot("2026-01-15", "shingrix"),
        ],
        today: "2026-03-15",
      }),
    ).toMatchObject({ status: "due", dose: { number: 2, of: 2 } });
  });

  it("Gürtelrose: Karte bei chronischer Erkrankung ab 18, Arzt empfiehlt → fällig (Epid Bull 45/2025, S. 4)", () => {
    const p = person("1981-06-01", { chronicIllness: true });
    const today = "2026-11-27";
    expect(run(zosterRule, { person: p, today })).toMatchObject({
      status: "discuss",
      dueDate: "2041-06-01",
      reason: { kind: "discuss", topic: "chronic", normalAge: 60 },
      source: { edition: "Epid Bull 45/2025", page: 4 },
    });
    expect(
      run(zosterRule, { person: p, decision: "doctor_recommends", today }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 2 },
      reason: { kind: "indication", indication: "doctor" },
    });
    expect(
      run(zosterRule, { person: p, decision: "doctor_not_applicable", today }),
    ).toMatchObject({ status: "future", dueDate: "2041-06-01" });
    // Grenzen: ab 18 Karte, mit 17 nicht, mit 59 noch, mit 60 nicht mehr.
    const chronic = (birth: string) =>
      run(zosterRule, {
        person: person(birth, { chronicIllness: true }),
        today,
      }).status;
    expect(chronic("2008-11-27")).toBe("discuss");
    expect(chronic("2008-11-28")).toBe("future");
    expect(chronic("1966-11-28")).toBe("discuss");
    expect(chronic("1966-11-27")).toBe("due");
  });
});
