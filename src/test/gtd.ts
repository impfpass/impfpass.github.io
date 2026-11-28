import type { Recommendation } from "@/core/rules/types";
import { eb4 } from "@/core/rules/recommendations/eb4";

/** Empfehlung für Tests der GTD-Übergabe; nicht genannte Felder bekommen Voreinstellungen. */
export function rec(
  overrides: Partial<Recommendation> & Pick<Recommendation, "id">,
): Recommendation {
  return {
    diseases: [],
    status: "future",
    dueDate: null,
    latestDate: null,
    dose: null,
    timing: "normal",
    reason: { kind: "none" },
    source: eb4(1, "Test"),
    ...overrides,
  };
}
