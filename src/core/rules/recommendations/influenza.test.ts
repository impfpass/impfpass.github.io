import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { influenzaRule } from "./influenza";

describe("influenzaRule", () => {
  it("Grippe: ab 60 jährlich (Epid Bull 4/2026, S. 14)", () => {
    const p = person("1966-11-27");
    expect(
      run(influenzaRule, { person: p, today: "2026-11-26" }),
    ).toMatchObject({
      status: "future",
      dueDate: "2026-11-27",
      reason: { kind: "age", age: 60 },
    });
    expect(
      run(influenzaRule, { person: p, today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-09-01",
      timing: "season",
      reason: { kind: "season", label: "2026/27" },
      source: { page: 14, section: "Tab. 2, Influenza, S" },
    });
    expect(
      run(influenzaRule, {
        person: person("1950-01-01"),
        vaccinations: [shot("2026-10-05", "efluelda")],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected", dueDate: "2027-09-01" });
    expect(influenzaRule.id).toBe("influenza");
    expect(influenzaRule.diseases).toEqual(["influenza"]);
    expect(influenzaRule.discussTopic).toBe("chronic");
  });

  it("Grippe: Tierkontakt und Arbeit mit Patienten (Epid Bull 4/2026, S. 14–15)", () => {
    for (const job of [{ animalContact: true }, { patients: true }]) {
      expect(
        run(influenzaRule, {
          person: person("1985-05-05", { job }),
          today: "2026-11-27",
        }),
      ).toMatchObject({
        status: "due",
        timing: "season",
        reason: { kind: "season", label: "2026/27" },
        source: { page: 15, section: "Tab. 2, Influenza, B" },
      });
    }
    expect(
      run(influenzaRule, {
        person: person("1985-05-05", { job: { bloodContact: true } }),
        today: "2026-11-27",
      }).status,
    ).toBe("future");
  });

  it("Grippe: chronische Erkrankung unter 60 ergibt Karte (Epid Bull 4/2026, S. 14)", () => {
    const p = person("1985-05-05", { chronicIllness: true });
    expect(
      run(influenzaRule, { person: p, today: "2026-11-27" }),
    ).toMatchObject({
      status: "discuss",
      dueDate: "2045-05-05",
      dose: null,
      reason: { kind: "discuss", topic: "chronic", normalAge: 60 },
      source: { page: 14, section: "Tab. 2, Influenza, Kategorie I" },
    });
    expect(influenzaRule.discussTargetGroup).toBe(
      "Personen ≥ 6 Monate mit erhöhter gesundheitlicher Gefährdung infolge einer Grunderkrankung",
    );
    expect(
      run(influenzaRule, {
        person: p,
        decision: "doctor_recommends",
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      reason: { kind: "season", label: "2026/27" },
      source: { page: 14, section: "Tab. 2, Influenza, Kategorie I" },
    });
  });

  it("Grippe: nach dem 31. März bis zur neuen Saison nicht fällig (Epid Bull 4/2026, S. 14)", () => {
    expect(
      run(influenzaRule, {
        person: person("1950-01-01"),
        today: "2027-04-01",
      }),
    ).toMatchObject({
      status: "future",
      dueDate: "2027-09-01",
      reason: { label: "2027/28" },
    });
  });
});
