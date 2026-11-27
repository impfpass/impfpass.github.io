import { describe, expect, it } from "vitest";
import { freeShot, person, run, shot } from "@/test/rules";
import { pneumococcalRule } from "./pneumococcal";

describe("pneumococcalRule", () => {
  it("Pneumokokken: Tag vor und am 60. Geburtstag (Epid Bull 4/2026, S. 17)", () => {
    const p = person("1966-11-27");
    expect(
      run(pneumococcalRule, { person: p, today: "2026-11-26", leadMonths: 0 }),
    ).toMatchObject({
      status: "future",
      dueDate: "2026-11-27",
      reason: { kind: "age", age: 60 },
      source: { page: 17, section: "Tab. 2, Pneumokokken, S" },
    });
    expect(
      run(pneumococcalRule, { person: p, today: "2026-11-27", leadMonths: 0 }),
    ).toMatchObject({ status: "due", dueDate: "2026-11-27" });
  });

  it("Pneumokokken: ab 60 einmalig PCV20, danach keine Wiederholung (Epid Bull 4/2026, S. 17)", () => {
    const vaccinations = [shot("2020-05-10", "prevenar-20")];
    expect(
      run(pneumococcalRule, {
        person: person("1960-01-01"),
        vaccinations,
        today: "2040-01-01",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
    // in jedem Alter, auch mit 30
    expect(
      run(pneumococcalRule, {
        person: person("1996-01-01"),
        vaccinations,
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected" });
  });

  it("Pneumokokken: Capvaxive zählt wie PCV20 (Epid Bull 4/2026, S. 17)", () => {
    expect(
      run(pneumococcalRule, {
        person: person("1960-01-01"),
        vaccinations: [shot("2026-01-10", "capvaxive")],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected" });
  });

  it("Pneumokokken: frühestens 6 Jahre nach PPSV23 (Epid Bull 4/2026, S. 17)", () => {
    const p = person("1960-01-01");
    const vaccinations = [shot("2020-05-10", "pneumovax-23")];
    expect(
      run(pneumococcalRule, {
        person: p,
        vaccinations,
        today: "2026-05-09",
        leadMonths: 0,
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2026-05-10",
      reason: { kind: "after_dose", lastDate: "2020-05-10", intervalYears: 6 },
    });
    expect(
      run(pneumococcalRule, {
        person: p,
        vaccinations,
        today: "2026-05-10",
        leadMonths: 0,
      }),
    ).toMatchObject({ status: "due", dueDate: "2026-05-10" });
  });

  it("Pneumokokken: frühere PPSV23-Dosis nach 60 verschiebt den Termin, die Begründung nennt den Abstand (Epid Bull 4/2026, S. 17)", () => {
    expect(
      run(pneumococcalRule, {
        person: person("1960-01-01"),
        vaccinations: [shot("2022-03-10", "pneumovax-23")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2028-03-10",
      reason: { kind: "after_dose", lastDate: "2022-03-10", intervalYears: 6 },
      source: { page: 17, section: "Tab. 2, Pneumokokken, S" },
    });
  });

  it("Pneumokokken: liegt die frühere Dosis lange zurück, zählt der 60. Geburtstag (Epid Bull 4/2026, S. 17)", () => {
    expect(
      run(pneumococcalRule, {
        person: person("1970-01-01"),
        vaccinations: [shot("2015-01-01", "pneumovax-23")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2030-01-01",
      reason: { kind: "age", age: 60 },
    });
  });

  it("Pneumokokken: Eintrag ohne Impfstoff zählt wie PPSV23 (Epid Bull 4/2026, S. 17)", () => {
    expect(
      run(pneumococcalRule, {
        person: person("1960-01-01"),
        vaccinations: [freeShot("2020-05-10", ["pneumococcal"])],
        today: "2026-05-09",
        leadMonths: 0,
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2026-05-10",
      reason: { kind: "after_dose", lastDate: "2020-05-10", intervalYears: 6 },
    });
  });

  it("Pneumokokken: nach PCV13 oder PCV15 nach 1 Jahr (Epid Bull 4/2026, S. 17)", () => {
    const p = person("1960-01-01");
    for (const product of ["prevenar-13", "vaxneuvance"]) {
      const vaccinations = [shot("2025-03-01", product)];
      expect(
        run(pneumococcalRule, {
          person: p,
          vaccinations,
          today: "2026-02-28",
          leadMonths: 0,
        }),
      ).toMatchObject({
        status: "future",
        dueDate: "2026-03-01",
        reason: {
          kind: "after_dose",
          lastDate: "2025-03-01",
          intervalYears: 1,
        },
      });
      expect(
        run(pneumococcalRule, {
          person: p,
          vaccinations,
          today: "2026-03-01",
          leadMonths: 0,
        }),
      ).toMatchObject({ status: "due" });
    }
  });

  it("Pneumokokken: Karte bei chronischer Erkrankung, Arzt empfiehlt → fällig (Epid Bull 4/2026, S. 31)", () => {
    const p = person("1981-06-01", { chronicIllness: true });
    const today = "2026-11-27";
    expect(run(pneumococcalRule, { person: p, today })).toMatchObject({
      status: "discuss",
      dueDate: "2041-06-01",
      reason: { kind: "discuss", topic: "chronic", normalAge: 60 },
      source: { page: 31 },
    });
    expect(
      run(pneumococcalRule, {
        person: p,
        decision: "doctor_recommends",
        today,
      }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "indication", indication: "doctor" },
    });
    expect(
      run(pneumococcalRule, {
        person: p,
        decision: "doctor_not_applicable",
        today,
      }),
    ).toMatchObject({ status: "future", dueDate: "2041-06-01" });
    // 17 Jahre: keine Karte
    expect(
      run(pneumococcalRule, {
        person: person("2008-11-28", { chronicIllness: true }),
        today,
      }).status,
    ).toBe("future");
  });

  it("Pneumokokken: Arzt empfiehlt nach früherer PPSV23-Dosis → Datum nach 6 Jahren (Epid Bull 4/2026, S. 31)", () => {
    const p = person("1981-06-01", { chronicIllness: true });
    const vaccinations = [shot("2024-02-01", "pneumovax-23")];
    expect(
      run(pneumococcalRule, {
        person: p,
        vaccinations,
        decision: "doctor_recommends",
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2030-02-01",
      reason: { kind: "indication", indication: "doctor" },
    });
    expect(
      run(pneumococcalRule, {
        person: p,
        vaccinations,
        decision: "doctor_recommends",
        today: "2030-02-01",
      }),
    ).toMatchObject({ status: "due", dueDate: "2030-02-01" });
  });
});
