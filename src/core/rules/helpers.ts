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
  opts: { exclude?: string[] } = {},
): Vaccination[] {
  const exclude = opts.exclude ?? [];
  const sorted = vs
    .filter(
      (v) =>
        v.diseases.includes(disease) &&
        !(v.productId !== null && exclude.includes(v.productId)),
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.filter((v, i) => i === 0 || v.date !== sorted[i - 1].date);
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

/** Erst das Datum, dann die laufende Nummer als Zahl. */
export function compareVersions(a: string, b: string): number {
  const [dateA, numA = "0"] = a.split(".");
  const [dateB, numB = "0"] = b.split(".");
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return Number(numA) - Number(numB);
}
