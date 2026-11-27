import { ageOn } from "../../dates";
import {
  addInterval,
  boosterStatus,
  dosesOf,
  nextInSeries,
  type Interval,
} from "../helpers";
import type { Rule, RuleResult, SourceRef } from "../types";
import { eb4 } from "./eb4";
import { FI_ENCEPUR, FI_FSME_IMMUN } from "./fachinfo";

const SOURCE = eb4(11, "Tab. 2, FSME");

interface Scheme {
  steps: { min: Interval; max: Interval }[];
  /** Alter am Tag der letzten Dosis, ab dem alle 3 Jahre aufgefrischt wird. */
  shortFromAge: number;
  source: SourceRef;
}

// FSME-Schnellschemata werden nicht abgebildet.
const FSME_IMMUN: Scheme = {
  steps: [
    { min: { months: 1 }, max: { months: 3 } },
    { min: { months: 5 }, max: { months: 12 } },
  ],
  shortFromAge: 60,
  source: FI_FSME_IMMUN,
};
const ENCEPUR: Scheme = {
  steps: [
    { min: { days: 14 }, max: { months: 3 } },
    { min: { months: 9 }, max: { months: 12 } },
  ],
  shortFromAge: 50,
  source: FI_ENCEPUR,
};

const FIRST_BOOSTER_YEARS = 3;
const SHORT_YEARS = 3;
// Auslegung: Encepur nennt 5–10 Jahre, umgesetzt wird die untere Grenze.
const LONG_YEARS = 5;

export const tbeRule: Rule = {
  id: "tbe",
  diseases: ["tbe"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    if (ctx.person.answers.fsme !== "yes") {
      return {
        status: "not_applicable",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "none" },
      };
    }
    const doses = dosesOf(ctx.vaccinations, "tbe");
    const last = doses[doses.length - 1];
    // Den Impfstoff bestimmt die letzte Dosis; ohne Impfstoff gelten die FSME-IMMUN-Werte.
    const scheme = last?.productId === "encepur" ? ENCEPUR : FSME_IMMUN;
    const total = scheme.steps.length + 1;
    if (doses.length < total) {
      return {
        ...nextInSeries(doses, scheme.steps, ctx.today, ctx.leadMonths),
        reason: { kind: "indication", indication: "tbe" },
        source: doses.length === 0 ? SOURCE : scheme.source,
      };
    }
    const years =
      doses.length === total
        ? FIRST_BOOSTER_YEARS
        : ageOn(ctx.person.birthDate, last.date) >= scheme.shortFromAge
          ? SHORT_YEARS
          : LONG_YEARS;
    const dueDate = addInterval(last.date, { years });
    return {
      status: boosterStatus(dueDate, ctx.today, ctx.leadMonths),
      dueDate,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "booster", lastDate: last.date, intervalYears: years },
      source: scheme.source,
    };
  },
};
