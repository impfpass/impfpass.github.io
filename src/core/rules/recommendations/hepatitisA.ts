import type { Vaccination } from "../../model";
import { dosesOf, nextInSeries, rapidFourthDose } from "../helpers";
import type { Rule, RuleResult } from "../types";
import { eb27 } from "./eb27";
import { eb4 } from "./eb4";

const SOURCE = eb27(61, "Kap. 5.6 Hepatitis A, Tab. 5");
// Eine unvollständige Serie wird komplettiert, nicht neu begonnen („Jede Impfung zählt!“).
const STARTED_SOURCE = eb4(40, "Kap. 4.5 Impfabstände");

// Einzelimpfstoff (Havrix, Vaqta): 2. Dosis frühestens 6 Monate nach der 1. (27/2026, Tab. 5).
const SINGLE_STEPS = [{ min: { months: 6 } }];
// Twinrix: 0, 1, 6 Monate (27/2026, Tab. 6).
const COMBINED_STEPS = [{ min: { months: 1 } }, { min: { months: 5 } }];

// offen: Gemischte Serien aus Einzelimpfstoff und Twinrix regeln die Quellen nicht. ImpfPass
// zählt sie als vollständig ab 2 Dosen Einzelimpfstoff oder 3 Dosen insgesamt, sonst gilt der
// Twinrix-Abstand. Kein spätester Termin, weil fehlende Dosen nachgeholt werden (4/2026, S. 40).
const isSingle = (v: Vaccination) => !v.diseases.includes("hepatitis_b");

const LONG_PROTECTION: RuleResult = {
  status: "protected",
  dueDate: null,
  latestDate: null,
  dose: null,
  timing: "normal",
  reason: { kind: "long_protection" },
};

export const hepatitisARule: Rule = {
  id: "hepatitis_a",
  diseases: ["hepatitis_a"],
  source: SOURCE,
  evaluate(ctx): RuleResult {
    const doses = dosesOf(ctx.vaccinations, "hepatitis_a");
    if (doses.length === 0) {
      return {
        status: "not_applicable",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "none" },
      };
    }
    const singles = doses.filter(isSingle).length;
    if (singles >= 2 || doses.length >= 4) return LONG_PROTECTION;
    if (doses.length === 3) {
      const rapid = rapidFourthDose(doses, ctx.today, ctx.leadMonths);
      if (!rapid) return LONG_PROTECTION;
      return {
        ...rapid,
        reason: { kind: "started", given: 3, total: 4 },
        source: STARTED_SOURCE,
      };
    }
    const steps =
      doses.length === 1 && singles === 1 ? SINGLE_STEPS : COMBINED_STEPS;
    return {
      ...nextInSeries(doses, steps, ctx.today, ctx.leadMonths),
      reason: {
        kind: "started",
        given: doses.length,
        total: steps.length + 1,
      },
      source: STARTED_SOURCE,
    };
  },
};
