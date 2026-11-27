import { addYears } from "../../dates";
import { addInterval, boosterStatus, dosesOf, startStatus } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";
import { tdNextDate } from "./td";

const SOURCE = eb4(16, "Tab. 2, Pertussis");
const JOB_SOURCE = eb4(17, "Tab. 2, Pertussis, Kategorie B");

export const pertussisRule: Rule = {
  id: "pertussis",
  diseases: ["pertussis"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    const doses = dosesOf(ctx.vaccinations, "pertussis");

    // Personal im Gesundheitsdienst und in Gemeinschaftseinrichtungen: alle 10 Jahre 1 Dosis.
    const { patients, communityFacility } = ctx.person.answers.job;
    if (patients || communityFacility) {
      const reason = { kind: "indication", indication: "job" } as const;
      if (doses.length === 0) {
        return {
          status: "due",
          dueDate: null,
          latestDate: null,
          dose: null,
          timing: "normal",
          reason,
          source: JOB_SOURCE,
        };
      }
      const dueDate = addInterval(doses[doses.length - 1].date, { years: 10 });
      return {
        status: boosterStatus(dueDate, ctx.today, ctx.leadMonths),
        dueDate,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason,
        source: JOB_SOURCE,
      };
    }

    // „Als Erwachsener“ heißt: Dosis ab dem 18. Geburtstag (Auslegung, S. 8, Tab. 1B).
    const adultFrom = addYears(ctx.person.birthDate, 18);
    if (doses.some((d) => d.date >= adultFrom)) {
      return {
        status: "protected",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "complete" },
      };
    }

    const dueDate = tdNextDate(ctx);
    return {
      status: startStatus(dueDate, ctx.today, ctx.leadMonths),
      dueDate,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "with_td" },
    };
  },
};
