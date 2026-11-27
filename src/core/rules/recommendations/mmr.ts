import { addYears } from "../../dates";
import { dosesOf, nextInSeries } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(15, "Tab. 2, Masern");
const JOB_SOURCE = eb4(16, "Tab. 2, MMR, B");

/** Beruf: insgesamt 2 Dosen, die 2. mindestens 1 Monat nach der 1. (S. 68, Tab. 11E, Zeile Röteln: Auslegung). */
const JOB_STEPS = [{ min: { months: 1 } }];
const JOB_TOTAL = JOB_STEPS.length + 1;

/** „Nach 1970 Geborene“ heißt Geburtsjahr ab 1971. */
const FIRST_BIRTH_YEAR = 1971;

const COMPLETE: RuleResult = {
  status: "protected",
  dueDate: null,
  latestDate: null,
  dose: null,
  timing: "normal",
  reason: { kind: "complete" },
};

export const mmrRule: Rule = {
  id: "mmr",
  diseases: ["measles", "mumps", "rubella"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    if (Number(ctx.person.birthDate.slice(0, 4)) < FIRST_BIRTH_YEAR) {
      return {
        status: "not_applicable",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "none" },
      };
    }
    const doses = dosesOf(ctx.vaccinations, "measles");
    const { patients, communityFacility, bloodContact } =
      ctx.person.answers.job;

    if (patients || communityFacility || bloodContact) {
      if (doses.length >= JOB_TOTAL) return COMPLETE;
      return {
        ...nextInSeries(doses, JOB_STEPS, ctx.today, ctx.leadMonths),
        reason: { kind: "indication", indication: "job" },
        source: JOB_SOURCE,
      };
    }

    // „Als Erwachsener“ heißt: Dosis ab dem 18. Geburtstag (Auslegung, S. 8, Tab. 1B).
    const adultFrom = addYears(ctx.person.birthDate, 18);
    if (doses.length >= 2 || doses.some((d) => d.date >= adultFrom)) {
      return COMPLETE;
    }
    return {
      status: "due",
      dueDate: null,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: {
        kind: "series",
        given: doses.length,
        total: doses.length + 1,
      },
    };
  },
};
