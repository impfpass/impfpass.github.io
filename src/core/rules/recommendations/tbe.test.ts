import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { tbeRule } from "./tbe";

const yes = (birth = "1980-01-01") => person(birth, { fsme: "yes" });
const at = (
  vs: ReturnType<typeof shot>[],
  today: string,
  p = yes(),
  leadMonths = 0,
) => run(tbeRule, { person: p, vaccinations: vs, today, leadMonths });

describe("tbeRule", () => {
  it("FSME: ohne „Ja“ keine Empfehlung (Epid Bull 4/2026, S. 11)", () => {
    for (const fsme of ["open", "no"] as const) {
      const result = run(tbeRule, {
        person: person("1980-01-01", { fsme }),
        vaccinations: [shot("2026-01-10", "fsme-immun")],
        today: "2026-11-27",
      });
      expect(result).toMatchObject({
        status: "not_applicable",
        reason: { kind: "none" },
      });
    }
    expect(tbeRule.id).toBe("tbe");
    expect(tbeRule.diseases).toEqual(["tbe"]);
    expect(tbeRule.source).toMatchObject({
      page: 11,
      section: "Tab. 2, FSME",
    });
  });

  it("FSME: mit „Ja“ und ohne Impfung ist die 1. Dosis fällig (Epid Bull 4/2026, S. 11)", () => {
    expect(at([], "2026-11-27")).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 3 },
      reason: { kind: "indication", indication: "tbe" },
      source: { page: 11 },
    });
  });

  it("FSME-IMMUN: 2. Dosis 1–3 Monate, 3. Dosis 5–12 Monate danach (FI FSME-IMMUN, 4.2)", () => {
    const one = [shot("2026-01-10", "fsme-immun")];
    expect(at(one, "2026-02-09").status).toBe("future");
    expect(at(one, "2026-02-10")).toMatchObject({
      status: "due",
      dueDate: "2026-02-10",
      latestDate: "2026-04-10",
      dose: { number: 2, of: 3 },
      reason: { kind: "indication", indication: "tbe" },
      source: { edition: "Fachinformation FSME-IMMUN 0,5 ml Erwachsene" },
    });
    expect(at(one, "2026-04-10").status).toBe("due");
    expect(at(one, "2026-04-11").status).toBe("overdue");
    const two = [...one, shot("2026-02-10", "fsme-immun")];
    expect(at(two, "2026-07-09").status).toBe("future");
    expect(at(two, "2026-07-10")).toMatchObject({
      status: "due",
      dueDate: "2026-07-10",
      latestDate: "2027-02-10",
      dose: { number: 3, of: 3 },
    });
    expect(at(two, "2027-02-10").status).toBe("due");
    expect(at(two, "2027-02-11").status).toBe("overdue");
  });

  it("Encepur: 2. Dosis 14 Tage bis 3 Monate, 3. Dosis 9–12 Monate danach (FI Encepur, 4.2)", () => {
    const one = [shot("2026-01-10", "encepur")];
    expect(at(one, "2026-01-23").status).toBe("future");
    expect(at(one, "2026-01-24")).toMatchObject({
      status: "due",
      dueDate: "2026-01-24",
      latestDate: "2026-04-10",
      dose: { number: 2, of: 3 },
      source: { edition: "Fachinformation Encepur Erwachsene" },
    });
    expect(at(one, "2026-04-11").status).toBe("overdue");
    const two = [...one, shot("2026-01-24", "encepur")];
    expect(at(two, "2026-10-23").status).toBe("future");
    expect(at(two, "2026-10-24")).toMatchObject({
      status: "due",
      dueDate: "2026-10-24",
      latestDate: "2027-01-24",
      dose: { number: 3, of: 3 },
    });
    expect(at(two, "2027-01-25").status).toBe("overdue");
  });

  it("FSME: erste Auffrischung 3 Jahre nach der 3. Dosis (FI FSME-IMMUN, 4.2)", () => {
    const three = [
      shot("2020-01-10", "fsme-immun"),
      shot("2020-02-10", "fsme-immun"),
      shot("2020-07-10", "fsme-immun"),
    ];
    expect(at(three, "2023-07-09").status).toBe("protected");
    expect(at(three, "2023-07-10")).toMatchObject({
      status: "overdue",
      dueDate: "2023-07-10",
      reason: { kind: "booster", lastDate: "2020-07-10", intervalYears: 3 },
      source: { edition: "Fachinformation FSME-IMMUN 0,5 ml Erwachsene" },
    });
    const enc = three.map((v) => ({ ...v, productId: "encepur" }));
    expect(at(enc, "2023-07-10")).toMatchObject({
      status: "overdue",
      source: { edition: "Fachinformation Encepur Erwachsene" },
    });
    // Ohne Impfstoff gelten die FSME-IMMUN-Werte.
    const none = three.map((v) => ({ ...v, productId: null }));
    expect(at(none, "2023-07-10").source?.edition).toBe(
      "Fachinformation FSME-IMMUN 0,5 ml Erwachsene",
    );
  });

  it("FSME-IMMUN: danach alle 5 Jahre, ab 60 alle 3 Jahre (FI FSME-IMMUN, 4.2)", () => {
    const base = [
      shot("2010-01-10", "fsme-immun"),
      shot("2010-02-10", "fsme-immun"),
      shot("2010-07-10", "fsme-immun"),
    ];
    // Letzte Dosis am Tag vor dem 60. Geburtstag.
    const young = [...base, shot("2025-07-09", "fsme-immun")];
    const p = yes("1965-07-10");
    expect(at(young, "2030-07-08", p).status).toBe("protected");
    expect(at(young, "2030-07-09", p)).toMatchObject({
      status: "overdue",
      dueDate: "2030-07-09",
      reason: { kind: "booster", intervalYears: 5 },
    });
    // Letzte Dosis am 60. Geburtstag.
    const old = [...base, shot("2025-07-10", "fsme-immun")];
    expect(at(old, "2028-07-09", p).status).toBe("protected");
    expect(at(old, "2028-07-10", p)).toMatchObject({
      status: "overdue",
      dueDate: "2028-07-10",
      reason: { kind: "booster", intervalYears: 3 },
    });
  });

  it("Encepur: danach alle 5 Jahre, ab 50 alle 3 Jahre (FI Encepur, 4.2)", () => {
    const base = [
      shot("2010-01-10", "encepur"),
      shot("2010-02-10", "encepur"),
      shot("2010-11-10", "encepur"),
    ];
    const p = yes("1970-07-10");
    // Letzte Dosis am Tag vor dem 50. Geburtstag.
    const young = [...base, shot("2020-07-09", "encepur")];
    expect(at(young, "2025-07-08", p).status).toBe("protected");
    expect(at(young, "2025-07-09", p)).toMatchObject({
      status: "overdue",
      reason: { kind: "booster", intervalYears: 5 },
      source: { edition: "Fachinformation Encepur Erwachsene" },
    });
    // Letzte Dosis am 50. Geburtstag.
    const old = [...base, shot("2020-07-10", "encepur")];
    expect(at(old, "2023-07-09", p).status).toBe("protected");
    expect(at(old, "2023-07-10", p)).toMatchObject({
      status: "overdue",
      reason: { kind: "booster", intervalYears: 3 },
    });
  });

  it("FSME: Auffrischung wird „bald“ innerhalb des Vorlaufs (FI FSME-IMMUN, 4.2)", () => {
    const three = [
      shot("2020-01-10", "fsme-immun"),
      shot("2020-02-10", "fsme-immun"),
      shot("2020-07-10", "fsme-immun"),
    ];
    expect(at(three, "2023-01-10", yes(), 6).status).toBe("soon");
    expect(at(three, "2023-01-09", yes(), 6).status).toBe("protected");
  });
});
