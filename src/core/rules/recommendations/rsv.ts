import { ageOrDoctor } from "../ageOrDoctor";
import { dosesOf } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(18, "Tab. 2, RSV, S");
const DISCUSS_SOURCE = eb4(18, "Tab. 2, RSV, Kategorie I");
const AGE = 75;

export const rsvRule: Rule = {
  id: "rsv",
  diseases: ["rsv"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Personen im Alter von 60 – 74 Jahren mit schweren Ausprägungen von chronischen Erkrankungen der Atmungsorgane, chronischen Herz-Kreislauf- und Nierenerkrankungen, hämato-onkologischen Erkrankungen, Diabetes mellitus (mit Komplikationen), einer chronischen neurologischen oder neuromuskulären Erkrankung oder einer schweren angeborenen oder erworbenen Immundefizienz",
  evaluate(ctx): RuleResult {
    if (dosesOf(ctx.vaccinations, "rsv").length >= 1) {
      return {
        status: "protected",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "complete" },
        source: SOURCE,
      };
    }
    // Der Saison-Termin für die Erinnerung ist Sache von Plan 4.
    return ageOrDoctor(ctx, {
      age: AGE,
      discussFrom: 60,
      source: SOURCE,
      discussSource: DISCUSS_SOURCE,
    });
  },
};
