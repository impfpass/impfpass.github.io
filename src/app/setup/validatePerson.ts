import { isValidISODate } from "@/core/dates";
import type { ISODate } from "@/core/model";
import { T } from "@/texts";

export interface PersonErrors {
  name?: string;
  birthDate?: string;
}

/** Prüft Name und Geburtsdatum (Ersteinrichtung und Profil). */
export function validatePerson(
  name: string,
  birthDate: string,
  today: ISODate,
): PersonErrors {
  const errors: PersonErrors = {};
  if (!name.trim()) errors.name = T.setup.errors.nameMissing;
  if (!birthDate) errors.birthDate = T.setup.errors.birthDateMissing;
  else if (!isValidISODate(birthDate))
    errors.birthDate = T.setup.errors.birthDateInvalid;
  else if (birthDate > today) errors.birthDate = T.setup.errors.birthDateFuture;
  return errors;
}
