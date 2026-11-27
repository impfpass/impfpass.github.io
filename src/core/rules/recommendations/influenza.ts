import { addYears, ageOn } from "../../dates";
import { dosesOf } from "../helpers";
import { seasonResult } from "../season";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(14, "Tab. 2, Influenza, S");
const DISCUSS_SOURCE = eb4(14, "Tab. 2, Influenza, Kategorie I");
const JOB_SOURCE = eb4(15, "Tab. 2, Influenza, B");
const AGE = 60;

export const influenzaRule: Rule = {
  id: "influenza",
  diseases: ["influenza"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Personen ≥ 6 Monate mit erhöhter gesundheitlicher Gefährdung infolge einer Grunderkrankung",
  evaluate(ctx): RuleResult {
    const { job, chronicIllness } = ctx.person.answers;
    const byAge = ageOn(ctx.person.birthDate, ctx.today) >= AGE;
    const byJob = job.patients || job.animalContact;
    const doctor = ctx.decision?.kind === "doctor_recommends";

    if (byAge || byJob || doctor) {
      return {
        ...seasonResult(
          dosesOf(ctx.vaccinations, "influenza"),
          ctx.today,
          ctx.seasonDay,
        ),
        // Arzt-Entscheidung: Zeile der Indikation (Grunderkrankung)
        source: byAge ? SOURCE : byJob ? JOB_SOURCE : DISCUSS_SOURCE,
      };
    }
    const birthday = addYears(ctx.person.birthDate, AGE);
    if (chronicIllness && ctx.decision?.kind !== "doctor_not_applicable") {
      return {
        status: "discuss",
        dueDate: birthday,
        latestDate: null,
        dose: null,
        timing: "season",
        reason: { kind: "discuss", topic: "chronic", normalAge: AGE },
        source: DISCUSS_SOURCE,
      };
    }
    return {
      status: "future",
      dueDate: birthday,
      latestDate: null,
      dose: null,
      timing: "season",
      reason: { kind: "age", age: AGE },
    };
  },
};
