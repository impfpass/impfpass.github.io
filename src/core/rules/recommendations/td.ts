import type { ISODate } from "../../model";
import { addInterval, boosterStatus, dosesOf, nextInSeries } from "../helpers";
import type { Rule, RuleContext, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(18, "Tab. 2, Tetanus");
const BOOSTER_SOURCE = eb4(68, "Text zu Tab. 11E");

/** Grundimmunisierung: 2. Dosis nach 4–8 Wochen, 3. Dosis 6–12 Monate nach der 2. (S. 11). */
const STEPS = [
  { min: { days: 28 }, max: { days: 56 } },
  { min: { months: 6 }, max: { months: 12 } },
];
const SERIES_TOTAL = STEPS.length + 1;
const BOOSTER_YEARS = 10;

function tetanusDoses(ctx: RuleContext) {
  // Reine Tetanus-Impfstoffe (Tetanol, historisch) zählen mit: Auslegung.
  return dosesOf(ctx.vaccinations, "tetanus");
}

/** Termin der nächsten Td-Dosis; null = sofort. */
export function tdNextDate(ctx: RuleContext): ISODate | null {
  const doses = tetanusDoses(ctx);
  if (doses.length === 0) return null;
  if (doses.length < SERIES_TOTAL) {
    return nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths).dueDate;
  }
  return addInterval(doses[doses.length - 1].date, { years: BOOSTER_YEARS });
}

export const tdRule: Rule = {
  id: "td",
  diseases: ["tetanus", "diphtheria"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    const doses = tetanusDoses(ctx);
    if (doses.length < SERIES_TOTAL) {
      return {
        ...nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths),
        reason: {
          kind: "catch_up",
          given: doses.length,
          total: SERIES_TOTAL,
        },
      };
    }
    const lastDate = doses[doses.length - 1].date;
    const dueDate = addInterval(lastDate, { years: BOOSTER_YEARS });
    return {
      status: boosterStatus(dueDate, ctx.today, ctx.leadMonths),
      dueDate,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "booster", lastDate, intervalYears: BOOSTER_YEARS },
      source: BOOSTER_SOURCE,
    };
  },
};
