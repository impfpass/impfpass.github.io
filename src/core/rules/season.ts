import { addMonths } from "../dates";
import type { ISODate, Vaccination } from "../model";
import { addInterval, type Interval } from "./helpers";
import type { RuleResult } from "./types";

// Auslegung: Die STIKO nennt keine Monate („Herbst/Winter“ bei Grippe, EB 4/2026, S. 14;
// „Spätsommer/Frühherbst“ bei COVID-19, EB 28/2026, S. 5). Saisonbeginn (Saison-Tag), das
// Vorziehen um einen Monat und das Saisonende am 31. März hat Claude festgelegt.

type SeasonResult = Pick<
  RuleResult,
  "status" | "dueDate" | "latestDate" | "dose" | "timing" | "reason"
>;

function label(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
}

/** Status einer Saison-Impfung (je Saison eine Dosis). */
export function seasonResult(
  doses: Vaccination[],
  today: ISODate,
  seasonDay: string,
  minGap?: Interval,
): SeasonResult {
  const start = (y: number): ISODate => `${y}-${seasonDay}`;
  const year = Number(today.slice(0, 4));
  const current = today >= start(year) ? year : year - 1;
  // Eine Dosis zählt ab einem Monat vor Saisonbeginn.
  const counts = (y: number) =>
    doses.some(
      (d) =>
        d.date >= addMonths(start(y), -1) &&
        d.date < addMonths(start(y + 1), -1),
    );
  const base = { latestDate: null, dose: null, timing: "season" } as const;

  for (const y of [current + 1, current]) {
    if (counts(y)) {
      return {
        ...base,
        status: "protected",
        dueDate: start(y + 1),
        reason: { kind: "season", label: label(y) },
      };
    }
  }
  if (today > `${current + 1}-03-31`) {
    return {
      ...base,
      status: "future",
      dueDate: start(current + 1),
      reason: { kind: "season", label: label(current + 1) },
    };
  }
  let dueDate = start(current);
  if (minGap && doses.length > 0) {
    const earliest = addInterval(
      doses.reduce((a, d) => (d.date > a ? d.date : a), doses[0].date),
      minGap,
    );
    if (earliest > dueDate) dueDate = earliest;
  }
  return {
    ...base,
    status: today >= dueDate ? "due" : "soon",
    dueDate,
    reason: { kind: "season", label: label(current) },
  };
}
