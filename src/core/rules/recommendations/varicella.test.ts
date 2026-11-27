import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { varicellaRule } from "./varicella";

const job = person("1990-05-05", { job: { patients: true } });

describe("varicellaRule", () => {
  it("Windpocken: ohne Beruf keine Empfehlung (Epid Bull 4/2026, S. 19)", () => {
    expect(
      run(varicellaRule, {
        person: person("1990-05-05"),
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
    expect(
      run(varicellaRule, {
        person: person("1990-05-05", { job: { animalContact: true } }),
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
    expect(varicellaRule.id).toBe("varicella");
    expect(varicellaRule.diseases).toEqual(["varicella"]);
    expect(varicellaRule.discussTopic).toBe("serology");
    expect(varicellaRule.discussTargetGroup).toMatch(
      /^Seronegative Personen \(einschließlich Auszubildende, Praktikanten und Praktikantinnen, Studierende und ehrenamtlich Tätige\)/,
    );
    expect(varicellaRule.source).toMatchObject({
      page: 19,
      section: "Tab. 2, Varizellen, B",
    });
  });

  it("Windpocken: Beruf ohne Impfung ergibt Karte „Bluttest klären“, Arzt empfiehlt → 1. Dosis fällig (Epid Bull 4/2026, S. 19)", () => {
    expect(
      run(varicellaRule, { person: job, today: "2026-11-27" }),
    ).toMatchObject({
      status: "discuss",
      dueDate: null,
      latestDate: null,
      dose: null,
      reason: { kind: "discuss", topic: "serology", normalAge: null },
    });
    expect(
      run(varicellaRule, {
        person: job,
        decision: "doctor_recommends",
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 2 },
      reason: { kind: "indication", indication: "doctor" },
    });
    expect(
      run(varicellaRule, {
        person: job,
        decision: "doctor_not_applicable",
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
  });

  it("Windpocken: zweite Dosis 4 bis 6 Wochen nach der ersten (Epid Bull 4/2026, S. 68)", () => {
    const vs = [shot("2026-10-01", "varivax")];
    const at = (today: string) =>
      run(varicellaRule, { person: job, vaccinations: vs, today });
    expect(at("2026-10-28").status).toBe("soon");
    expect(at("2026-10-29")).toMatchObject({
      status: "due",
      dueDate: "2026-10-29",
      latestDate: "2026-11-12",
      dose: { number: 2, of: 2 },
      reason: { kind: "indication", indication: "job" },
      source: { page: 68, section: "Text zu Tab. 11E" },
    });
    expect(at("2026-11-12").status).toBe("due");
    expect(at("2026-11-13").status).toBe("overdue");
  });

  it("Windpocken: zwei Dosen sind vollständig (Epid Bull 4/2026, S. 19)", () => {
    expect(
      run(varicellaRule, {
        person: job,
        vaccinations: [
          shot("2026-01-01", "varilrix"),
          shot("2026-02-01", "varilrix"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      reason: { kind: "complete" },
    });
  });
});
