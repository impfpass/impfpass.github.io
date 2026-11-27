import { addInterval, boosterStatus, dosesOf, nextInSeries } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(18, "Tab. 2, Poliomyelitis");
const BOOSTER_SOURCE = eb4(68, "Tab. 11E");

/** Nachholschema N1, N2 (mindestens 1 Monat), N3 (mindestens 6 Monate), ohne Höchstabstand. */
const STEPS = [{ min: { months: 1 } }, { min: { months: 6 } }];
const PRIMARY_DOSES = STEPS.length + 1;

export const polioRule: Rule = {
  id: "polio",
  diseases: ["polio"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    const doses = dosesOf(ctx.vaccinations, "polio");
    if (doses.length < PRIMARY_DOSES) {
      return {
        ...nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths),
        reason: {
          kind: "catch_up",
          given: doses.length,
          total: PRIMARY_DOSES,
        },
      };
    }
    if (doses.length === PRIMARY_DOSES) {
      // offen: Die Stelle (Tab. 11E, A1 in der Spalte „Impfintervall alle 10 Jahre“) nennt den
      // Abstand der einmaligen Auffrischung zur 3. Dosis nicht ausdrücklich; umgesetzt sind 10 Jahre.
      const dueDate = addInterval(doses[doses.length - 1].date, { years: 10 });
      return {
        status: boosterStatus(dueDate, ctx.today, ctx.leadMonths),
        dueDate,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: {
          kind: "series",
          given: PRIMARY_DOSES,
          total: PRIMARY_DOSES + 1,
        },
        source: BOOSTER_SOURCE,
      };
    }
    return {
      status: "protected",
      dueDate: null,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "complete" },
    };
  },
};
