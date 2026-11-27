import type { PersonErrors } from "./validatePerson";

/**
 * Springt ins erste fehlerhafte Feld von `PersonFields`. Vorher müssen die
 * Meldungen gerendert sein, damit Screenreader sie über aria-describedby mit
 * vorlesen.
 */
export function focusFirstError(idPrefix: string, errors: PersonErrors) {
  const field = errors.name ? "name" : "birth";
  document.getElementById(`${idPrefix}-${field}`)?.focus();
}
