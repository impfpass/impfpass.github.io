import type { Decision, Person, Vaccination } from "../model";
import { dosesOf } from "./helpers";

/** Einmal nachfragen, wenn FSME-Impfungen eingetragen sind, die Frage aber nicht mit Ja beantwortet ist (Spec 7.2). */
export function needsTbeQuestion(
  person: Person,
  vaccinations: Vaccination[],
  decisions: Decision[],
): boolean {
  if (person.answers.fsme === "yes") return false;
  if (dosesOf(vaccinations, "tbe").length === 0) return false;
  return !decisions.some(
    (d) => d.personId === person.id && d.recommendationId === "tbe",
  );
}
