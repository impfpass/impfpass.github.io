import { addInterval, dosesOf } from "../helpers";
import { ageOrDoctor } from "../ageOrDoctor";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(17, "Tab. 2, Pneumokokken, S");
const DISCUSS_SOURCE = eb4(31, "Kap. 3.2, Pneumokokken, Indikationsimpfung");
const AGE = 60;

export const pneumococcalRule: Rule = {
  id: "pneumococcal",
  diseases: ["pneumococcal"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Kinder, Jugendliche und Erwachsene mit erhöhter gesundheitlicher Gefährdung infolge einer Grunderkrankung",
  evaluate(ctx): RuleResult {
    const doses = dosesOf(ctx.vaccinations, "pneumococcal");
    // offen: Capvaxive (PCV21) zählt wie PCV20, die STIKO nennt PCV21 nicht.
    if (
      doses.some(
        (d) => d.productId === "prevenar-20" || d.productId === "capvaxive",
      )
    ) {
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
    let earliest = null;
    if (doses.length > 0) {
      const last = doses[doses.length - 1];
      // offen: nach PCV13/PCV15 1 Jahr gilt laut STIKO für die Indikationsgruppe,
      // für die Standardgruppe ab 60 sagt sie nichts.
      const pcv =
        last.productId === "prevenar-13" || last.productId === "vaxneuvance";
      // Auslegung: Eintrag ohne Impfstoff zählt wie PPSV23 (6 Jahre).
      earliest = addInterval(last.date, pcv ? { years: 1 } : { years: 6 });
    }
    return ageOrDoctor(ctx, {
      age: AGE,
      discussFrom: 18,
      source: SOURCE,
      discussSource: DISCUSS_SOURCE,
      earliest,
    });
  },
};
