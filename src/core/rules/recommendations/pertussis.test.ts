import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { pertussisRule } from "./pertussis";

const p = person("1967-03-01");
const threeTd = () => [
  shot("1990-01-01", "td-pur", "year"),
  shot("1991-01-01", "td-pur", "year"),
  shot("2016-11-27", "td-rix"),
];

describe("pertussisRule", () => {
  it("Keuchhusten: mit der nächsten fälligen Td-Impfung (Epid Bull 4/2026, S. 16)", () => {
    const result = run(pertussisRule, {
      person: p,
      vaccinations: threeTd(),
      today: "2026-11-27",
    });
    expect(result).toMatchObject({
      status: "due",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: null,
      reason: { kind: "with_td" },
    });
    expect(pertussisRule.id).toBe("pertussis");
    expect(pertussisRule.diseases).toEqual(["pertussis"]);
    expect(pertussisRule.source).toMatchObject({
      page: 16,
      section: "Tab. 2, Pertussis",
    });
  });

  it("Keuchhusten: Vorlauf 6 Monate vor der nächsten Td-Impfung (Epid Bull 4/2026, S. 16)", () => {
    const at = (today: string) =>
      run(pertussisRule, { person: p, vaccinations: threeTd(), today }).status;
    expect(at("2026-05-26")).toBe("future");
    expect(at("2026-05-27")).toBe("soon");
    expect(at("2026-11-26")).toBe("soon");
  });

  it("Keuchhusten: ohne Td-Eintrag sofort fällig (Epid Bull 4/2026, S. 16)", () => {
    expect(
      run(pertussisRule, { person: p, today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "with_td" },
    });
  });

  it("Keuchhusten: eine Tdap-Dosis als Erwachsener genügt, als Kind nicht (Epid Bull 4/2026, S. 16)", () => {
    expect(
      run(pertussisRule, {
        person: p,
        vaccinations: [shot("1997-03-01", "boostrix")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      latestDate: null,
      dose: null,
      reason: { kind: "complete" },
    });
    const withChildDose = [shot("1977-03-01", "boostrix"), ...threeTd()];
    expect(
      run(pertussisRule, {
        person: p,
        vaccinations: withChildDose,
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "due", reason: { kind: "with_td" } });
  });

  it("Keuchhusten: Dosis ab dem 18. Geburtstag zählt, am Tag davor nicht (Epid Bull 4/2026, S. 8)", () => {
    const at = (date: string) =>
      run(pertussisRule, {
        person: p,
        vaccinations: [shot(date, "boostrix")],
        today: "2026-11-27",
      }).reason.kind;
    expect(at("1985-02-28")).toBe("with_td");
    expect(at("1985-03-01")).toBe("complete");
  });

  it("Keuchhusten: bei Tätigkeit in einer Gemeinschaftseinrichtung alle 10 Jahre (Epid Bull 4/2026, S. 17)", () => {
    const job = person("1967-03-01", { job: { communityFacility: true } });
    const vs = [shot("2016-11-27", "boostrix")];
    const at = (today: string) =>
      run(pertussisRule, { person: job, vaccinations: vs, today });
    expect(at("2026-05-26").status).toBe("protected");
    expect(at("2026-05-27").status).toBe("soon");
    expect(at("2026-11-26").status).toBe("soon");
    expect(at("2026-11-27")).toMatchObject({
      status: "overdue",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: null,
      reason: { kind: "indication", indication: "job" },
      source: { page: 17, section: "Tab. 2, Pertussis, Kategorie B" },
    });
  });

  it("Keuchhusten: bei Tätigkeit mit Patienten ohne Dosis sofort fällig (Epid Bull 4/2026, S. 17)", () => {
    const job = person("1967-03-01", { job: { patients: true } });
    expect(
      run(pertussisRule, { person: job, today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      reason: { kind: "indication", indication: "job" },
      source: { page: 17 },
    });
  });
});
