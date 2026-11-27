import { describe, expect, it } from "vitest";
import { freeShot, person, run, shot } from "@/test/rules";
import { hepatitisARule } from "./hepatitisA";

const TODAY = "2026-11-27";
const p = person("1985-05-05");
const check = (vaccinations: ReturnType<typeof shot>[]) =>
  run(hepatitisARule, { person: p, vaccinations, today: TODAY });

describe("hepatitisARule", () => {
  it("Hepatitis A: ohne Dosis keine Empfehlung (Epid Bull 27/2026, S. 61)", () => {
    expect(check([]).status).toBe("not_applicable");
    expect(hepatitisARule.id).toBe("hepatitis_a");
    expect(hepatitisARule.diseases).toEqual(["hepatitis_a"]);
    expect(hepatitisARule.source).toMatchObject({
      edition: "Epid Bull 27/2026",
      page: 61,
    });
  });

  it("Hepatitis A: 1 Dosis Einzelimpfstoff, 2. frühestens nach 6 Monaten (Epid Bull 27/2026, S. 61, Tab. 5)", () => {
    expect(check([shot("2026-08-27", "havrix")])).toMatchObject({
      status: "soon",
      dueDate: "2027-02-27",
      latestDate: null,
      dose: { number: 2, of: 2 },
      timing: "follow_up",
      reason: { kind: "started", given: 1, total: 2 },
      source: { page: 40 },
    });
  });

  it("Hepatitis A: 1 Dosis vor 8 Monaten ist fällig (Epid Bull 27/2026, S. 61, Tab. 5)", () => {
    expect(check([shot("2026-03-27", "havrix")])).toMatchObject({
      status: "due",
      dueDate: "2026-09-27",
    });
  });

  it("Hepatitis A: alte Einzeldosis wird nicht „überfällig“ (Epid Bull 4/2026, S. 40)", () => {
    expect(check([shot("2016-01-01", "havrix")])).toMatchObject({
      status: "due",
      latestDate: null,
    });
  });

  it("Hepatitis A: 2 Dosen Einzelimpfstoff, geschützt (Epid Bull 27/2026, S. 61)", () => {
    expect(
      check([shot("2020-01-01", "havrix"), shot("2020-08-01", "vaqta")]),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      dose: null,
      reason: { kind: "long_protection" },
    });
  });

  it("Hepatitis A: Twinrix nach 0, 1, 6 Monaten, geschützt (Epid Bull 27/2026, S. 62, Tab. 6)", () => {
    expect(
      check([
        shot("2026-01-01", "twinrix"),
        shot("2026-02-01", "twinrix"),
        shot("2026-07-01", "twinrix"),
      ]),
    ).toMatchObject({
      status: "protected",
      reason: { kind: "long_protection" },
    });
  });

  it("Hepatitis A: 1 Twinrix, 2. Dosis nach 1 Monat (Epid Bull 27/2026, S. 62, Tab. 6)", () => {
    expect(check([shot("2026-11-01", "twinrix")])).toMatchObject({
      status: "soon",
      dueDate: "2026-12-01",
      dose: { number: 2, of: 3 },
    });
  });

  it("Hepatitis A: 2 Twinrix, 3. Dosis 5 Monate nach der 2. (Epid Bull 27/2026, S. 62, Tab. 6)", () => {
    expect(
      check([shot("2026-01-01", "twinrix"), shot("2026-02-01", "twinrix")]),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-07-01",
      dose: { number: 3, of: 3 },
    });
  });

  it("Hepatitis A: Twinrix-Schnellschema, 4. Dosis nach 12 Monaten (Epid Bull 4/2026, S. 23)", () => {
    expect(
      check([
        shot("2026-01-01", "twinrix"),
        shot("2026-01-08", "twinrix"),
        shot("2026-01-22", "twinrix"),
      ]),
    ).toMatchObject({
      dueDate: "2027-01-01",
      dose: { number: 4, of: 4 },
      reason: { kind: "started", given: 3, total: 4 },
    });
  });

  it("Hepatitis A: gemischt, Twinrix und eine Einzeldosis ergeben 3. Dosis (Epid Bull 27/2026, S. 62)", () => {
    expect(
      check([shot("2026-01-01", "twinrix"), shot("2026-07-01", "havrix")]),
    ).toMatchObject({
      status: "soon",
      dueDate: "2026-12-01",
      dose: { number: 3, of: 3 },
    });
  });

  it("Hepatitis A: gemischt, 2 Einzeldosen machen vollständig (Epid Bull 27/2026, S. 61)", () => {
    expect(
      check([
        shot("2020-01-01", "havrix"),
        shot("2020-02-01", "twinrix"),
        shot("2020-08-01", "havrix"),
      ]).status,
    ).toBe("protected");
  });

  it("Hepatitis A: doppelt am selben Tag eingetragen zählt einmal (Epid Bull 27/2026, S. 61)", () => {
    expect(
      check([shot("2026-03-27", "havrix"), shot("2026-03-27", "havrix")]),
    ).toMatchObject({ dose: { number: 2, of: 2 } });
  });

  it("Hepatitis A: freie Eingabe nur gegen Hepatitis A zählt als Einzelimpfstoff (Epid Bull 27/2026, S. 61)", () => {
    expect(check([freeShot("2026-03-27", ["hepatitis_a"])])).toMatchObject({
      dose: { number: 2, of: 2 },
    });
  });

  it("Hepatitis A: freie Eingabe gegen Hepatitis A und B zählt wie Twinrix (Epid Bull 27/2026, S. 62)", () => {
    expect(
      check([freeShot("2026-03-27", ["hepatitis_a", "hepatitis_b"])]),
    ).toMatchObject({
      dose: { number: 2, of: 3 },
      dueDate: "2026-04-27",
    });
  });

  it("Hepatitis A: Dosen mit nur bekanntem Jahr oder Monat zählen einzeln (Epid Bull 27/2026, S. 61)", () => {
    expect(
      check([
        shot("2019-01-01", "havrix", "year"),
        shot("2019-08-01", "havrix", "year"),
      ]).status,
    ).toBe("protected");
    expect(
      check([
        shot("2019-01-01", "twinrix", "year"),
        shot("2019-02-01", "twinrix", "year"),
        shot("2019-07-01", "twinrix", "year"),
      ]).status,
    ).toBe("protected");
    expect(
      check([
        shot("2026-01-01", "twinrix", "month"),
        shot("2026-01-08", "twinrix", "month"),
        shot("2026-01-22", "twinrix", "month"),
      ]),
    ).toMatchObject({ dueDate: "2027-01-01", dose: { number: 4, of: 4 } });
  });
});
