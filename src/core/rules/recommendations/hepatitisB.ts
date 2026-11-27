import {
  addInterval,
  dosesOf,
  nextInSeries,
  rapidFourthDose,
} from "../helpers";
import type { Reason, Rule, RuleContext, RuleResult } from "../types";
import { eb27 } from "./eb27";
import { eb4 } from "./eb4";

const SOURCE = eb4(13, "Tab. 2, Hepatitis B, Nr. 3");
const DISCUSS_SOURCE = eb4(13, "Tab. 2, Hepatitis B, Nr. 1");
// Eine unvollständige Serie wird komplettiert, nicht neu begonnen („Jede Impfung zählt!“).
const STARTED_SOURCE = eb4(40, "Kap. 4.5 Impfabstände");
const COMPLETE_SOURCE = eb4(13, "Tab. 2, Hepatitis B, Anmerkungen");
const RAPID_SOURCE = eb27(66, "Kap. 5.7.6 Impfschemata, Tab. 7");

// offen: Das Schema 0-1-6 Monate steht in EB 4/2026, S. 67 (Text zu Tab. 11D) und gilt dort für
// 11- bis 17-Jährige; für Erwachsene sagt die STIKO es nicht ausdrücklich. Heplisav B nennt die
// STIKO nur in Tab. 12 (S. 69); laut Fachinformation reichen 2 Dosen im Abstand von 1 Monat.
const STEPS = [{ min: { months: 1 } }, { min: { months: 5 } }];
const TOTAL = STEPS.length + 1;

function seriesResult(
  ctx: RuleContext,
  reasonFor: (given: number, total: number) => Reason,
): RuleResult {
  const doses = dosesOf(ctx.vaccinations, "hepatitis_b", {
    keepImprecise: true,
  });
  const heplisav = doses.filter((v) => v.productId === "heplisav-b");
  const heplisavDone =
    heplisav.length >= 2 &&
    heplisav[heplisav.length - 1].date >=
      addInterval(heplisav[0].date, { days: 28 });
  const rapid = heplisavDone
    ? null
    : rapidFourthDose(doses, ctx.today, ctx.leadMonths);
  if (rapid)
    return { ...rapid, reason: { kind: "rapid" }, source: RAPID_SOURCE };
  // Nach erfolgreicher Grundimmunisierung keine Auffrischung (S. 13, Anmerkungen).
  if (heplisavDone || doses.length >= TOTAL) {
    return {
      status: "protected",
      dueDate: null,
      latestDate: null,
      dose: null,
      timing: "normal",
      reason: { kind: "complete" },
      source: COMPLETE_SOURCE,
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

    // Eine angefangene Serie wird auch ohne Indikation zu Ende geführt und geht
    // der Karte bei chronischer Erkrankung vor. Ist sie vollständig, bleibt es bei
    // chronischer Erkrankung bei der Karte: Bei Immundefizienz empfiehlt die STIKO
    // Kontrollen und ggf. Auffrischungen (S. 13, Anmerkungen).
    const chronicCard =
      ctx.person.answers.chronicIllness &&
      ctx.decision?.kind !== "doctor_not_applicable";
    if (
      dosesOf(ctx.vaccinations, "hepatitis_b", { keepImprecise: true }).length >
      0
    ) {
      const result = seriesResult(ctx, (given, total) => ({
        kind: "started",
        given,
        total,
      }));
      if (result.status !== "protected") {
        return result.reason.kind === "started"
          ? { ...result, source: STARTED_SOURCE }
          : result;
      }
      if (!chronicCard) return result;
    }

    if (chronicCard) {
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
