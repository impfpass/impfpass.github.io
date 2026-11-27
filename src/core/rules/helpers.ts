import { addDays, addMonths, addYears } from "../dates";
import type { DiseaseId, ISODate, Vaccination } from "../model";
import type { RuleResult } from "./types";

export type Interval = { days?: number; months?: number; years?: number };

/** Addiert Jahre, dann Monate, dann Tage. */
export function addInterval(date: ISODate, i: Interval): ISODate {
  let result = date;
  if (i.years) result = addYears(result, i.years);
  if (i.months) result = addMonths(result, i.months);
  if (i.days) result = addDays(result, i.days);
  return result;
}

/** Impfungen gegen die Krankheit, aufsteigend, eine Dosis je Tag. */
export function dosesOf(
  vs: Vaccination[],
  disease: DiseaseId,
  opts: {
    exclude?: string[];
    /**
     * Gleiche Tage nur zusammenfassen, wenn beide Einträge taggenau sind.
     * Einträge mit nur Monat oder Jahr liegen auf dem frühesten Tag und
     * zählen einzeln (drei Impfungen „2019“ sind drei Dosen).
     */
    keepImprecise?: boolean;
  } = {},
): Vaccination[] {
  const exclude = opts.exclude ?? [];
  const sorted = vs
    .filter(
      (v) =>
        v.diseases.includes(disease) &&
        !(v.productId !== null && exclude.includes(v.productId)),
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.filter((v, i) => {
    if (i === 0) return true;
    const prev = sorted[i - 1];
    if (v.date !== prev.date) return true;
    return (
      opts.keepImprecise === true &&
      (v.datePrecision !== "day" || prev.datePrecision !== "day")
    );
  });
}

export function startStatus(
  due: ISODate | null,
  today: ISODate,
  leadMonths: number,
): "future" | "soon" | "due" {
  if (due === null || today >= due) return "due";
  if (today >= addMonths(due, -leadMonths)) return "soon";
  return "future";
}

export function boosterStatus(
  due: ISODate,
  today: ISODate,
  leadMonths: number,
): "protected" | "soon" | "overdue" {
  if (today >= due) return "overdue";
  if (today >= addMonths(due, -leadMonths)) return "soon";
  return "protected";
}

export function nextDoseStatus(
  earliest: ISODate,
  latest: ISODate | null,
  today: ISODate,
  leadMonths: number,
): "future" | "soon" | "due" | "overdue" {
  if (latest !== null && today > latest) return "overdue";
  if (today >= earliest) return "due";
  if (today >= addMonths(earliest, -leadMonths)) return "soon";
  return "future";
}

/**
 * `steps[i]` ist der Abstand der Dosis i + 2 zur vorigen Dosis.
 * Aufrufer rufen es nur bei unvollständiger Serie auf.
 */
export function nextInSeries(
  doses: Vaccination[],
  steps: { min: Interval; max?: Interval }[],
  today: ISODate,
  leadMonths: number,
): Pick<RuleResult, "status" | "dueDate" | "latestDate" | "dose" | "timing"> {
  const total = steps.length + 1;
  if (doses.length === 0) {
    return {
      status: "due",
      dueDate: null,
      latestDate: null,
      dose: { number: 1, of: total },
      timing: "normal",
    };
  }
  const step = steps[doses.length - 1];
  const last = doses[doses.length - 1].date;
  const earliest = addInterval(last, step.min);
  const latest = step.max ? addInterval(last, step.max) : null;
  return {
    status: nextDoseStatus(earliest, latest, today, leadMonths),
    dueDate: earliest,
    latestDate: latest,
    dose: { number: doses.length + 1, of: total },
    timing: "follow_up",
  };
}

/**
 * Schnellschema: Liegt die 3. Dosis weniger als 4 Monate nach der 2., fehlt der
 * lange Abstand vor der letzten Dosis (Epid Bull 4/2026, S. 40), und die 4. Dosis
 * folgt 12 Monate nach der 1. (Twinrix 0, 7, 21 Tage; Hepatitis B 0, 1, 2 Monate).
 * Beim Standardschema 0, 1, 6 Monate und bei nur bekanntem Jahr `null`.
 */
export function rapidFourthDose(
  doses: Vaccination[],
  today: ISODate,
  leadMonths: number,
): Pick<
  RuleResult,
  "status" | "dueDate" | "latestDate" | "dose" | "timing"
> | null {
  if (doses.length !== 3) return null;
  const [first, second, third] = doses;
  // Mit nur bekanntem Jahr ist der Abstand zwischen 2. und 3. Dosis offen.
  if (second.datePrecision === "year" || third.datePrecision === "year")
    return null;
  if (third.date >= addMonths(second.date, 4)) return null;
  const due = addMonths(first.date, 12);
  return {
    status: nextDoseStatus(due, null, today, leadMonths),
    dueDate: due,
    latestDate: null,
    dose: { number: 4, of: 4 },
    timing: "follow_up",
  };
}

/** Erst das Datum, dann die laufende Nummer als Zahl. */
export function compareVersions(a: string, b: string): number {
  const [dateA, numA = "0"] = a.split(".");
  const [dateB, numB = "0"] = b.split(".");
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return Number(numA) - Number(numB);
}
