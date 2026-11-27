import { normalizeToPrecision } from "../dates";
import type { DatePrecision, DiseaseId, ISODate } from "../model";

export interface Dated {
  date: ISODate;
  datePrecision: DatePrecision;
  diseases: DiseaseId[];
}

/** Länge des Datums-Strings, die bei dieser Genauigkeit zählt. */
const SIGNIFICANT: Record<DatePrecision, number> = {
  year: 4,
  month: 7,
  day: 10,
};

/**
 * Möglicherweise dieselbe Impfung: Die Daten stimmen in der gröberen der
 * beiden Genauigkeiten überein und mindestens eine Krankheit ist gemeinsam.
 */
export function isPossibleDuplicate(a: Dated, b: Dated): boolean {
  const n = Math.min(
    SIGNIFICANT[a.datePrecision],
    SIGNIFICANT[b.datePrecision],
  );
  const da = normalizeToPrecision(a.date, a.datePrecision).slice(0, n);
  const db = normalizeToPrecision(b.date, b.datePrecision).slice(0, n);
  return da === db && a.diseases.some((d) => b.diseases.includes(d));
}
