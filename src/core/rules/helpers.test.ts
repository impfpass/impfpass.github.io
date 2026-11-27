import { shot } from "@/test/rules";
import {
  boosterStatus,
  compareVersions,
  dosesOf,
  nextDoseStatus,
  nextInSeries,
  rapidFourthDose,
  startStatus,
} from "./helpers";

describe("Statushilfen", () => {
  it("startStatus an den Grenzen des Vorlaufs", () => {
    expect(startStatus("2027-03-01", "2026-08-31", 6)).toBe("future");
    expect(startStatus("2027-03-01", "2026-09-01", 6)).toBe("soon");
    expect(startStatus("2027-03-01", "2027-02-28", 6)).toBe("soon");
    expect(startStatus("2027-03-01", "2027-03-01", 6)).toBe("due");
    expect(startStatus(null, "2026-01-01", 6)).toBe("due");
  });
  it("boosterStatus an den Grenzen", () => {
    expect(boosterStatus("2030-05-04", "2029-11-03", 6)).toBe("protected");
    expect(boosterStatus("2030-05-04", "2029-11-04", 6)).toBe("soon");
    expect(boosterStatus("2030-05-04", "2030-05-04", 6)).toBe("overdue");
  });
  it("nextDoseStatus mit Höchstabstand", () => {
    expect(nextDoseStatus("2027-01-01", "2027-05-01", "2026-06-30", 6)).toBe(
      "future",
    );
    expect(nextDoseStatus("2027-01-01", "2027-05-01", "2026-07-01", 6)).toBe(
      "soon",
    );
    expect(nextDoseStatus("2027-01-01", "2027-05-01", "2027-05-01", 6)).toBe(
      "due",
    );
    expect(nextDoseStatus("2027-01-01", "2027-05-01", "2027-05-02", 6)).toBe(
      "overdue",
    );
    expect(nextDoseStatus("2027-01-01", null, "2040-01-01", 6)).toBe("due");
  });
});

describe("dosesOf", () => {
  it("zählt doppelte Einträge am selben Tag einmal und lässt ausgeschlossene Impfstoffe weg", () => {
    const vs = [
      shot("2024-01-10", "td-immun"),
      shot("2020-05-04", "td-immun"),
      shot("2020-05-04", "boostrix"),
      shot("2019-01-01", "zostavax"),
    ];
    expect(dosesOf(vs, "tetanus").map((v) => v.date)).toEqual([
      "2020-05-04",
      "2024-01-10",
    ]);
    expect(dosesOf(vs, "zoster")).toHaveLength(1);
    expect(dosesOf(vs, "zoster", { exclude: ["zostavax"] })).toEqual([]);
  });
});

describe("nextInSeries", () => {
  it("ohne Dosis und mit einer Dosis", () => {
    const steps = [{ min: { months: 2 }, max: { months: 6 } }];
    expect(nextInSeries([], steps, "2026-11-27", 6)).toEqual({
      status: "due",
      dueDate: null,
      latestDate: null,
      dose: { number: 1, of: 2 },
      timing: "normal",
    });
    expect(
      nextInSeries([shot("2026-10-01", "shingrix")], steps, "2026-11-27", 6),
    ).toEqual({
      status: "soon",
      dueDate: "2026-12-01",
      latestDate: "2027-04-01",
      dose: { number: 2, of: 2 },
      timing: "follow_up",
    });
  });
});

describe("compareVersions", () => {
  it("vergleicht Datum, dann laufende Nummer als Zahl", () => {
    expect(compareVersions("2026-12-01.2", "2026-12-01.10")).toBeLessThan(0);
    expect(compareVersions("2027-01-01.1", "2026-12-31.9")).toBeGreaterThan(0);
    expect(compareVersions("2026-12-01.1", "2026-12-01.1")).toBe(0);
  });
});

describe("rapidFourthDose", () => {
  it("Schnellschema: 3. Dosis höchstens 2 Monate nach der 1. ergibt 4. Dosis nach 12 Monaten (Epid Bull 27/2026, S. 62, Tab. 6)", () => {
    const twinrix = [
      shot("2026-01-01", "twinrix"),
      shot("2026-01-08", "twinrix"),
      shot("2026-01-22", "twinrix"),
    ];
    expect(rapidFourthDose(twinrix, "2026-11-27", 6)).toEqual({
      status: "soon",
      dueDate: "2027-01-01",
      latestDate: null,
      dose: { number: 4, of: 4 },
      timing: "follow_up",
    });
    const engerix = [
      shot("2026-01-01", "engerix-b"),
      shot("2026-02-01", "engerix-b"),
      shot("2026-03-01", "engerix-b"),
    ];
    expect(rapidFourthDose(engerix, "2027-01-02", 6)?.status).toBe("due");
    const standard = [
      shot("2026-01-01", "twinrix"),
      shot("2026-02-01", "twinrix"),
      shot("2026-07-01", "twinrix"),
    ];
    expect(rapidFourthDose(standard, "2026-11-27", 6)).toBeNull();
    expect(rapidFourthDose(twinrix.slice(0, 2), "2026-11-27", 6)).toBeNull();
  });
});
