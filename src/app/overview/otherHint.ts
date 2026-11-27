import type { DiseaseId } from "@/core/catalog/diseases";
import type { Vaccination } from "@/core/model";
import { dosesOf } from "@/core/rules/helpers";
import { T } from "@/texts";

/**
 * Satz zur Schutzdauer unter „Weitere Impfungen“ für Impfungen ohne Empfehlung.
 * Quellen: Epid Bull 4/2026, S. 16, 19, 59, 60; Epid Bull 27/2026, S. 89.
 */
export function otherHint(
  disease: DiseaseId,
  vaccinations: Vaccination[],
): string | null {
  const H = T.overview.otherHints;
  switch (disease) {
    case "rabies": {
      const n = dosesOf(vaccinations, "rabies", { keepImprecise: true }).length;
      if (n >= 3) return H.rabiesComplete;
      if (n === 2) return H.rabiesTwo;
      return n === 1 ? H.rabiesOne : null;
    }
    case "tuberculosis":
      return H.tuberculosis;
    case "smallpox":
      // Imvanex schützt vor Mpox und Pocken; der Satz gilt nur der klassischen Pockenimpfung.
      return vaccinations.some(
        (v) => v.diseases.includes("smallpox") && !v.diseases.includes("mpox"),
      )
        ? H.smallpox
        : null;
    default:
      return null;
  }
}
