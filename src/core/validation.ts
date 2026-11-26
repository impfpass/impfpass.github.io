import { T } from "@/app/texts";
import { isValidISODate, normalizeToPrecision } from "./dates";
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

/** Länge des Datums-Strings, die bei dieser Genauigkeit zählt. */
const SIGNIFICANT: Record<DatePrecision, number> = {
  year: 4, // YYYY
  month: 7, // YYYY-MM
  day: 10, // YYYY-MM-DD
};

/**
 * Prüft einen Eintrag. Zukunft und Geburtstag werden auf der Ebene der
 * bekannten Genauigkeit verglichen: Ist nur das Jahr bekannt, zählt nur das Jahr.
 */
export function validateEntry(
  input: EntryInput,
  birthDate: ISODate,
  today: ISODate,
): EntryErrors {
  const errors: EntryErrors = {};

  if (!input.date || !isValidISODate(input.date)) {
    errors.date = T.entry.errors.dateMissing;
  } else {
    const n = SIGNIFICANT[input.datePrecision];
    const date = normalizeToPrecision(input.date, input.datePrecision).slice(
      0,
      n,
    );
    if (date > today.slice(0, n)) errors.date = T.entry.errors.dateFuture;
    else if (date < birthDate.slice(0, n))
      errors.date = T.entry.errors.dateBeforeBirth;
  }

  if (input.productId === null && input.diseases.length === 0) {
    errors.product = T.entry.errors.productMissing;
  }

  return errors;
}
