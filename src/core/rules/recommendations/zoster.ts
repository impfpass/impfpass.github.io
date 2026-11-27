import { ageOrDoctor } from "../ageOrDoctor";
import { dosesOf, nextInSeries } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb4 } from "./eb4";
import { eb45 } from "./eb45";

const SOURCE = eb4(13, "Tab. 2, Herpes zoster, S");
const SERIES_SOURCE = eb4(68, "Tab. 11E, Fußnote c");
const DISCUSS_SOURCE = eb45(4, "Beschluss – Empfehlung");
const AGE = 60;

export const zosterRule: Rule = {
  id: "zoster",
  diseases: ["zoster"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Personen ≥ 18 Jahre mit erhöhter gesundheitlicher Gefährdung an Herpes zoster zu erkranken infolge einer angeborenen bzw. erworbenen, insbesondere einer iatrogenen, Immundefizienz oder infolge schwerer Ausprägung einer chronischen Grunderkrankung",
  evaluate(ctx): RuleResult {
    // Zostavax (Lebendimpfstoff) zählt nicht (EB 4/2026, S. 25).
    // offen: Abstand zum Totimpfstoff nach früherer Zostavax-Impfung (EB 50/2018: 5 Jahre, RKI-FAQ 2025: 2 Monate), bis dahin wird Zostavax nur nicht gezählt.
    const doses = dosesOf(ctx.vaccinations, "zoster", {
      exclude: ["zostavax"],
    });
    if (doses.length >= 2) {
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
    if (doses.length === 1) {
      // Die 2. Dosis bleibt Thema, auch wenn die 6 Monate überschritten sind.
      return {
        ...nextInSeries(
          doses,
          [{ min: { months: 2 }, max: { months: 6 } }],
          ctx.today,
          ctx.leadMonths,
        ),
        reason: { kind: "series", given: 1, total: 2 },
        source: SERIES_SOURCE,
      };
    }
    return ageOrDoctor(ctx, {
      age: AGE,
      discussFrom: 18,
      source: SOURCE,
      discussSource: DISCUSS_SOURCE,
      dose: { number: 1, of: 2 },
    });
  },
};
