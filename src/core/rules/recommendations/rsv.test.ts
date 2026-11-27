import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { rsvRule } from "./rsv";

describe("rsvRule", () => {
  it("RSV: wer am 29. Februar geboren ist, wird im Nicht-Schaltjahr am 28. Februar 75 (Epid Bull 4/2026, S. 18)", () => {
    expect(
      run(rsvRule, { person: person("1952-02-29"), today: "2027-02-28" }),
    ).toMatchObject({ status: "due", dueDate: "2027-02-28" });
  });

  it("RSV: einmalig ab 75 (Epid Bull 4/2026, S. 18)", () => {
    const p = person("1951-11-27");
    expect(
      run(rsvRule, { person: p, today: "2026-11-26", leadMonths: 0 }),
    ).toMatchObject({ status: "future", dueDate: "2026-11-27" });
    expect(run(rsvRule, { person: p, today: "2026-11-27" })).toMatchObject({
      status: "due",
      dueDate: "2026-11-27",
      timing: "normal",
      reason: { kind: "age", age: 75 },
      source: { page: 18, section: "Tab. 2, RSV, Kategorie S" },
    });
    expect(
      run(rsvRule, {
        person: p,
        vaccinations: [shot("2026-10-01", "arexvy")],
        today: "2036-01-01",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
  });

  it("RSV: Karte nur zwischen 60 und 74 (Epid Bull 4/2026, S. 18)", () => {
    const today = "2026-11-27";
    const chronic = (birth: string) =>
      run(rsvRule, { person: person(birth, { chronicIllness: true }), today });
    // 59 mit Schalter: keine Karte
    expect(chronic("1966-11-28")).toMatchObject({
      status: "future",
      dueDate: "2041-11-28",
      reason: { kind: "age", age: 75 },
    });
    // am 60. Geburtstag Karte
    expect(chronic("1966-11-27")).toMatchObject({
      status: "discuss",
      dueDate: "2041-11-27",
      reason: { kind: "discuss", topic: "chronic", normalAge: 75 },
      source: { page: 18, section: "Tab. 2, RSV, Kategorie I" },
    });
    // 74 Jahre: noch Karte; am 75. Geburtstag nicht mehr
    expect(chronic("1952-11-28").status).toBe("discuss");
    expect(chronic("1951-11-27").status).toBe("due");
  });

  it("RSV: Arzt empfiehlt → fällig, nicht zutreffend → zurück auf Alter (Epid Bull 4/2026, S. 18)", () => {
    const p = person("1961-05-01", { chronicIllness: true });
    const today = "2026-11-27";
    expect(
      run(rsvRule, { person: p, decision: "doctor_recommends", today }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "indication", indication: "doctor" },
    });
    expect(
      run(rsvRule, { person: p, decision: "doctor_not_applicable", today }),
    ).toMatchObject({ status: "future", dueDate: "2036-05-01" });
  });
});
