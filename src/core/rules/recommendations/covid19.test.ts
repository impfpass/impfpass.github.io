import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { covid19Rule } from "./covid19";

describe("covid19Rule", () => {
  it("COVID-19: Standard erst ab 75 (Epid Bull 28/2026, S. 5)", () => {
    const p = person("1951-11-27");
    expect(run(covid19Rule, { person: p, today: "2026-11-26" })).toMatchObject({
      status: "future",
      dueDate: "2026-11-27",
      reason: { kind: "age", age: 75 },
    });
    expect(run(covid19Rule, { person: p, today: "2026-11-27" })).toMatchObject({
      status: "due",
      timing: "season",
      reason: { kind: "season", label: "2026/27" },
      source: { page: 5, section: "Auszug Tab. 2" },
    });
    expect(covid19Rule.source).toMatchObject({
      edition: "Epid Bull 28/2026",
      date: "2026-07-09",
      page: 5,
      section: "Auszug Tab. 2",
    });
    expect(covid19Rule.id).toBe("covid19");
    expect(covid19Rule.diseases).toEqual(["covid19"]);
    expect(covid19Rule.discussTopic).toBe("chronic");
  });

  it("COVID-19: Arbeit mit Patienten, Tierkontakt zählt nicht (Epid Bull 28/2026, S. 5)", () => {
    expect(
      run(covid19Rule, {
        person: person("1985-05-05", { job: { patients: true } }),
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      reason: { kind: "season" },
      source: { page: 5, section: "Auszug Tab. 2, Kategorie B" },
    });
    expect(
      run(covid19Rule, {
        person: person("1985-05-05", { job: { animalContact: true } }),
        today: "2026-11-27",
      }).status,
    ).toBe("future");
  });

  it("COVID-19: chronische Erkrankung unter 75 ergibt Karte (Epid Bull 28/2026, S. 3)", () => {
    const p = person("1985-05-05", { chronicIllness: true });
    expect(run(covid19Rule, { person: p, today: "2026-11-27" })).toMatchObject({
      status: "discuss",
      dueDate: "2060-05-05",
      reason: { kind: "discuss", topic: "chronic", normalAge: 75 },
      source: { edition: "Epid Bull 28/2026", page: 3, section: "Beschluss" },
    });
    expect(covid19Rule.discussTargetGroup).toBe(
      "Personen im Alter von ≥ 6 Monaten bei erhöhter gesundheitlicher Gefährdung für einen schweren COVID-19-Verlauf infolge einer Grunderkrankung",
    );
    expect(
      run(covid19Rule, {
        person: p,
        decision: "doctor_recommends",
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      source: { edition: "Epid Bull 28/2026", page: 3, section: "Beschluss" },
    });
  });

  it("COVID-19: möglichst 6 Monate Abstand zur letzten Impfung (Epid Bull 28/2026, S. 4)", () => {
    const p = person("1945-01-01");
    const at = (today: string) =>
      run(covid19Rule, {
        person: p,
        vaccinations: [shot("2026-05-10", "comirnaty")],
        today,
      });
    expect(at("2026-11-09")).toMatchObject({
      status: "soon",
      dueDate: "2026-11-10",
    });
    expect(at("2026-11-10")).toMatchObject({
      status: "due",
      dueDate: "2026-11-10",
    });
  });
});
