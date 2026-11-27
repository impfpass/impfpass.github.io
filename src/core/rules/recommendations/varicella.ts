import { dosesOf, nextInSeries } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(19, "Tab. 2, Varizellen, Kategorie B");
const INTERVAL_SOURCE = eb4(68, "Text zu Tab. 11E");

/** 2 Dosen im Abstand von 4 bis 6 Wochen (S. 68). */
const STEPS = [{ min: { days: 28 }, max: { days: 42 } }];
const TOTAL = STEPS.length + 1;

const NOT_APPLICABLE: RuleResult = {
  status: "not_applicable",
  dueDate: null,
  latestDate: null,
  dose: null,
  timing: "normal",
  reason: { kind: "none" },
};

export const varicellaRule: Rule = {
  id: "varicella",
  diseases: ["varicella"],
  source: SOURCE,
  discussTopic: "serology",
  discussTargetGroup:
    "Seronegative Personen (einschließlich Auszubildende, Praktikanten und Praktikantinnen, Studierende und ehrenamtlich Tätige) in medizinischen Einrichtungen, Einrichtungen der Pflege, Gemeinschaftseinrichtungen und bei Tätigkeiten mit Kontakt zu potenziell infektiösem Material",
  evaluate(ctx): RuleResult {
    const { patients, communityFacility, bloodContact } =
      ctx.person.answers.job;
    if (!(patients || communityFacility || bloodContact)) return NOT_APPLICABLE;

    const doses = dosesOf(ctx.vaccinations, "varicella");
    if (doses.length >= TOTAL) {
      return {
        status: "protected",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "complete" },
      };
    }
    if (doses.length === 1) {
      return {
        ...nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths),
        reason: { kind: "indication", indication: "job" },
        source: INTERVAL_SOURCE,
      };
    }

    // Ohne Dosis: Der Serostatus ist unbekannt, deshalb zuerst der Bluttest beim Arzt (Spec 7.2: Auslegung).
    switch (ctx.decision?.kind) {
      case "doctor_recommends":
        return {
          ...nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths),
          reason: { kind: "indication", indication: "doctor" },
        };
      case "doctor_not_applicable":
        return NOT_APPLICABLE;
      default:
        return {
          status: "discuss",
          dueDate: null,
          latestDate: null,
          dose: null,
          timing: "normal",
          reason: { kind: "discuss", topic: "serology", normalAge: null },
        };
    }
  },
};
