import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { mmrRule } from "./mmr";

describe("mmrRule", () => {
  it("MMR: vor 1971 Geborene nicht, ab 1971 schon (Epid Bull 4/2026, S. 15)", () => {
    expect(
      run(mmrRule, { person: person("1970-12-31"), today: "2026-11-27" })
        .status,
    ).toBe("not_applicable");
    expect(
      run(mmrRule, { person: person("1971-01-01"), today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "series", given: 0, total: 1 },
    });
    expect(mmrRule.id).toBe("mmr");
    expect(mmrRule.diseases).toEqual(["measles", "mumps", "rubella"]);
    expect(mmrRule.source).toMatchObject({
      page: 15,
      section: "Tab. 2, Masern",
    });
  });

  it("MMR: eine Dosis in der Kindheit reicht nicht, eine als Erwachsener schon (Epid Bull 4/2026, S. 15)", () => {
    const p = person("1980-03-01");
    const at = (date: string) =>
      run(mmrRule, {
        person: p,
        vaccinations: [shot(date, "priorix")],
        today: "2026-11-27",
      });
    expect(at("1990-01-01")).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "series", given: 1, total: 2 },
    });
    expect(at("1998-02-28").status).toBe("due");
    expect(at("1998-03-01")).toMatchObject({
      status: "protected",
      dueDate: null,
      latestDate: null,
      dose: null,
      reason: { kind: "complete" },
    });
  });

  it("MMR: zwei Dosen sind vollständig, auch beide in der Kindheit (Epid Bull 4/2026, S. 15)", () => {
    expect(
      run(mmrRule, {
        person: person("1980-03-01"),
        vaccinations: [
          shot("1982-01-01", "m-m-rvaxpro"),
          shot("1985-01-01", "priorix-tetra"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
  });

  it("MMR: bei Arbeit mit Patienten zwei Dosen, die zweite frühestens 1 Monat nach der ersten (Epid Bull 4/2026, S. 16)", () => {
    const job = person("1980-03-01", { job: { patients: true } });
    expect(run(mmrRule, { person: job, today: "2026-11-27" })).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 2 },
      reason: { kind: "indication", indication: "job" },
      source: { page: 16, section: "Tab. 2, MMR, Kategorie B" },
    });
    // Eine Dosis als Erwachsener reicht im Beruf nicht.
    const vs = [shot("2026-10-27", "priorix")];
    const at = (today: string) =>
      run(mmrRule, { person: job, vaccinations: vs, today });
    expect(at("2026-11-26").status).toBe("soon");
    expect(at("2026-11-27")).toMatchObject({
      status: "due",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: { number: 2, of: 2 },
      reason: { kind: "indication", indication: "job" },
      source: { page: 16 },
    });
    expect(
      run(mmrRule, {
        person: job,
        vaccinations: [...vs, shot("2026-11-27", "priorix")],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
  });

  it("MMR: Beruf in Gemeinschaftseinrichtung oder mit Blutkontakt zählt ebenso (Epid Bull 4/2026, S. 16)", () => {
    for (const job of [{ communityFacility: true }, { bloodContact: true }]) {
      expect(
        run(mmrRule, {
          person: person("1980-03-01", { job }),
          today: "2026-11-27",
        }),
      ).toMatchObject({ dose: { number: 1, of: 2 } });
    }
  });

  it("MMR: vor 1971 Geborene sind auch im Beruf nicht betroffen (Epid Bull 4/2026, S. 16)", () => {
    expect(
      run(mmrRule, {
        person: person("1970-12-31", { job: { patients: true } }),
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
  });
});
