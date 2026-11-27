import { describe, expect, it } from "vitest";
import type { Decision } from "@/core/model";
import { person, shot } from "@/test/rules";
import { needsTbeQuestion } from "./questions";

const decision = (recommendationId: string): Decision => ({
  personId: "p1",
  recommendationId,
  kind: "declined",
  at: "2026-11-26T10:00:00.000Z",
});
const fsmeShot = [shot("2026-01-10", "fsme-immun")];
const p = person("1980-01-01");

describe("needsTbeQuestion", () => {
  it("Nachfrage, wenn FSME-Impfungen eingetragen sind und die Frage nicht mit Ja beantwortet ist", () => {
    expect(needsTbeQuestion(p, fsmeShot, [])).toBe(true);
    expect(
      needsTbeQuestion(person("1980-01-01", { fsme: "no" }), fsmeShot, []),
    ).toBe(true);
    // keine FSME-Impfung
    expect(needsTbeQuestion(p, [], [])).toBe(false);
    expect(needsTbeQuestion(p, [shot("2026-01-10", "boostrix")], [])).toBe(
      false,
    );
    // nach einer Entscheidung zu tbe nicht mehr
    expect(needsTbeQuestion(p, fsmeShot, [decision("tbe")])).toBe(false);
    // Entscheidung zu einer anderen Empfehlung zählt nicht
    expect(needsTbeQuestion(p, fsmeShot, [decision("td")])).toBe(true);
    // bei „Ja“ keine Nachfrage
    expect(
      needsTbeQuestion(person("1980-01-01", { fsme: "yes" }), fsmeShot, []),
    ).toBe(false);
  });
});
