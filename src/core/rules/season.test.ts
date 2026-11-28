import { describe, expect, it } from "vitest";
import { shot } from "@/test/rules";
import { seasonLabel, seasonResult } from "./season";

describe("seasonLabel", () => {
  it("nennt die Saison mit zweistelligem Folgejahr, auch über die Jahrhundertgrenze", () => {
    expect(seasonLabel(2027)).toBe("2027/28");
    expect(seasonLabel(2099)).toBe("2099/00");
  });
});

describe("seasonResult", () => {
  it("vor dem Saison-Tag geimpft in der Vorsaison: geschützt bis zum Saison-Tag", () => {
    expect(
      seasonResult([shot("2025-10-15", "fluad")], "2026-08-31", "09-01"),
    ).toMatchObject({
      status: "protected",
      dueDate: "2026-09-01",
      latestDate: null,
      dose: null,
      timing: "season",
      reason: { kind: "season", label: "2025/26" },
    });
  });

  it("ab dem Saison-Tag ohne Impfung fällig", () => {
    expect(
      seasonResult([shot("2025-10-15", "fluad")], "2026-09-01", "09-01"),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-09-01",
      latestDate: null,
      dose: null,
      timing: "season",
      reason: { kind: "season", label: "2026/27" },
    });
  });

  it("Impfung Mitte August zählt für die neue Saison", () => {
    expect(
      seasonResult([shot("2026-08-15", "fluad")], "2026-09-10", "09-01"),
    ).toMatchObject({
      status: "protected",
      dueDate: "2027-09-01",
      reason: { label: "2026/27" },
    });
  });

  it("Impfung einen Monat vor dem Saison-Tag zählt, einen Tag früher noch nicht", () => {
    const at = (date: string) =>
      seasonResult([shot(date, "fluad")], "2026-09-10", "09-01").status;
    expect(at("2026-08-01")).toBe("protected");
    expect(at("2026-07-31")).toBe("due");
  });

  it("Impfung für die kommende Saison schützt schon vor deren Beginn", () => {
    expect(
      seasonResult([shot("2026-08-20", "fluad")], "2026-08-25", "09-01"),
    ).toMatchObject({
      status: "protected",
      dueDate: "2027-09-01",
      reason: { label: "2026/27" },
    });
  });

  it("bis 31. März noch fällig, ab 1. April für die nächste Saison", () => {
    expect(seasonResult([], "2027-03-31", "09-01").status).toBe("due");
    expect(seasonResult([], "2027-04-01", "09-01")).toMatchObject({
      status: "future",
      dueDate: "2027-09-01",
      reason: { label: "2027/28" },
    });
  });

  it("Mindestabstand verschiebt die Fälligkeit, vorher bald fällig", () => {
    const doses = [shot("2026-05-10", "comirnaty")];
    expect(
      seasonResult(doses, "2026-09-15", "09-01", { months: 6 }),
    ).toMatchObject({ status: "soon", dueDate: "2026-11-10" });
    expect(
      seasonResult(doses, "2026-11-10", "09-01", { months: 6 }),
    ).toMatchObject({ status: "due", dueDate: "2026-11-10" });
  });

  it("Mindestabstand vor dem Saison-Tag ändert nichts", () => {
    expect(
      seasonResult([shot("2025-10-15", "comirnaty")], "2026-09-01", "09-01", {
        months: 6,
      }),
    ).toMatchObject({ status: "due", dueDate: "2026-09-01" });
  });

  it("anderer Saison-Tag", () => {
    expect(
      seasonResult([shot("2025-10-15", "fluad")], "2026-09-15", "10-01"),
    ).toMatchObject({
      status: "protected",
      dueDate: "2026-10-01",
      reason: { label: "2025/26" },
    });
  });
});
