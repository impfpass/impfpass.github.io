import { dosesOf, nextInSeries, rapidFourthDose } from "../helpers";
import type { Reason, Rule, RuleContext, RuleResult } from "../types";
import { eb4 } from "./eb4";

const SOURCE = eb4(13, "Tab. 2, Hepatitis B, Nr. 3");
const DISCUSS_SOURCE = eb4(13, "Tab. 2, Hepatitis B, Nr. 1");
// Eine unvollständige Serie wird komplettiert, nicht neu begonnen („Jede Impfung zählt!“).
const STARTED_SOURCE = eb4(40, "Kap. 4.5 Impfabstände");

// offen: Das Schema 0-1-6 Monate steht in EB 4/2026, S. 67 (Text zu Tab. 11D) und gilt dort für
// 11- bis 17-Jährige; für Erwachsene sagt die STIKO es nicht ausdrücklich. Heplisav B (laut
// Zulassung zwei Dosen) wird nicht unterschieden und wie ein Impfstoff mit drei Dosen behandelt.
const STEPS = [{ min: { months: 1 } }, { min: { months: 5 } }];
const TOTAL = STEPS.length + 1;

function seriesResult(
  ctx: RuleContext,
  reasonFor: (given: number, total: number) => Reason,
): RuleResult {
  const doses = dosesOf(ctx.vaccinations, "hepatitis_b");
  const rapid = rapidFourthDose(doses, ctx.today, ctx.leadMonths);
  if (rapid) return { ...rapid, reason: reasonFor(doses.length, 4) };
  // Nach erfolgreicher Grundimmunisierung keine Auffrischung (S. 13, Anmerkungen).
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
  return {
    ...nextInSeries(doses, STEPS, ctx.today, ctx.leadMonths),
    reason: reasonFor(doses.length, TOTAL),
  };
}

export const hepatitisBRule: Rule = {
  id: "hepatitis_b",
  diseases: ["hepatitis_b"],
  source: SOURCE,
  discussTopic: "chronic",
  discussTargetGroup:
    "Personen, bei denen wegen einer vorbestehenden oder zu erwartenden Immundefizienz, z. B. eine geplante Immunsuppression, oder wegen einer vorbestehenden Erkrankung ein schwerer Verlauf einer Hepatitis-B-Erkrankung zu erwarten ist",
  evaluate(ctx): RuleResult {
    const { patients, bloodContact } = ctx.person.answers.job;
    const job = patients || bloodContact;
    const doctor = ctx.decision?.kind === "doctor_recommends";

    if (job || doctor) {
      return seriesResult(ctx, () => ({
        kind: "indication",
        indication: job ? "job" : "doctor",
      }));
    }

    // Eine angefangene Serie wird auch ohne Indikation zu Ende geführt und
    // geht der Karte bei chronischer Erkrankung vor.
    if (dosesOf(ctx.vaccinations, "hepatitis_b").length > 0) {
      const result = seriesResult(ctx, (given, total) => ({
        kind: "started",
        given,
        total,
      }));
      return result.status === "protected"
        ? result
        : { ...result, source: STARTED_SOURCE };
    }

    if (
      ctx.person.answers.chronicIllness &&
      ctx.decision?.kind !== "doctor_not_applicable"
    ) {
      return {
        status: "discuss",
        dueDate: null,
        latestDate: null,
        dose: null,
        timing: "normal",
        reason: { kind: "discuss", topic: "chronic", normalAge: null },
        source: DISCUSS_SOURCE,
      };
    }
    return {
      status: "not_applicable",
      dueDate: null,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "none" },
    };
  },
};
