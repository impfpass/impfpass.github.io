import { T } from "@/texts";
import {
  isValidISODate,
  normalizeToPrecision,
  SIGNIFICANT_LENGTH,
} from "./dates";
import type { DatePrecision, DiseaseId, ISODate } from "./model";

export interface EntryInput {
  date: ISODate;
  datePrecision: DatePrecision;
  productId: string | null;
  label: string;
  diseases: DiseaseId[];
  batch?: string;
  doctor?: string;
  note?: string;
}

export type EntryErrors = Partial<Record<"date" | "product", string>>;

/**
 * Liegt ein gültiges Datum in der Zukunft oder vor dem Geburtsdatum? Verglichen
 * wird auf der Ebene der bekannten Genauigkeit: Ist nur das Jahr bekannt, zählt
 * nur das Jahr. Ohne Geburtsdatum (`null`) zählt nur die Zukunft.
 */
export function dateRangeIssue(
  date: ISODate,
  datePrecision: DatePrecision,
  birthDate: ISODate | null,
  today: ISODate,
): "future" | "beforeBirth" | null {
  const n = SIGNIFICANT_LENGTH[datePrecision];
  const known = normalizeToPrecision(date, datePrecision).slice(0, n);
  if (known > today.slice(0, n)) return "future";
  if (birthDate !== null && known < birthDate.slice(0, n)) return "beforeBirth";
  return null;
}

/** Prüft einen Eintrag; Datum wie bei `dateRangeIssue`. */
export function validateEntry(
  input: EntryInput,
  birthDate: ISODate,
  today: ISODate,
): EntryErrors {
  const errors: EntryErrors = {};

  if (!input.date || !isValidISODate(input.date)) {
    errors.date = T.entry.errors.dateMissing;
  } else {
    const issue = dateRangeIssue(
      input.date,
      input.datePrecision,
      birthDate,
      today,
    );
    if (issue === "future") errors.date = T.entry.errors.dateFuture;
    else if (issue === "beforeBirth") {
      errors.date = T.entry.errors.dateBeforeBirth;
    }
  }

  if (input.productId === null && input.diseases.length === 0) {
    errors.product = T.entry.errors.productMissing;
  }

  return errors;
}
