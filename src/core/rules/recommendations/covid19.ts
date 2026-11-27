import { addYears, ageOn } from "../../dates";
import { dosesOf } from "../helpers";
import { seasonResult } from "../season";
import type { Rule, RuleResult } from "../types";
import { eb28 } from "./eb28";

const SOURCE = eb28(5, "Auszug Tab. 2");
const JOB_SOURCE = eb28(5, "Auszug Tab. 2, Kategorie B");
const DISCUSS_SOURCE = eb28(3, "Beschluss");
const AGE = 75;

export const covid19Rule: Rule = {
  id: "covid19",
  diseases: ["covid19"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Personen im Alter von ≥ 6 Monaten bei erhöhter gesundheitlicher Gefährdung für einen schweren COVID-19-Verlauf infolge einer Grunderkrankung",
  evaluate(ctx): RuleResult {
    const { job, chronicIllness } = ctx.person.answers;
    const byAge = ageOn(ctx.person.birthDate, ctx.today) >= AGE;
    const byJob = job.patients;
    const doctor = ctx.decision?.kind === "doctor_recommends";

    if (byAge || byJob || doctor) {
      return {
        // Möglichst 6 Monate Abstand zur letzten Impfung (EB 28/2026, S. 4).
        ...seasonResult(
          dosesOf(ctx.vaccinations, "covid19"),
          ctx.today,
          ctx.seasonDay,
          { months: 6 },
        ),
        // Arzt-Entscheidung: Beschluss mit der Indikation (Grunderkrankung)
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
