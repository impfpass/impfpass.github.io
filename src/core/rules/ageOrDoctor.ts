import { addYears, ageOn } from "../dates";
import type { ISODate } from "../model";
import { startStatus } from "./helpers";
import type { RuleContext, RuleResult, SourceRef } from "./types";

/**
 * Gemeinsames Muster „Alter oder Arzt“ für Impfungen, die ab einem Alter
 * empfohlen sind und bei Grunderkrankung früher in Frage kommen.
 */
export function ageOrDoctor(
  ctx: RuleContext,
  opts: {
    /** Regelalter A. */
    age: number;
    /** Alter, ab dem die STIKO bei Grunderkrankung eine Indikation nennt. */
    discussFrom: number;
    source: SourceRef;
    discussSource: SourceRef;
    /** Frühere Dosis, nach der die nächste frühestens `intervalYears` später kommt, sonst null. */
    after?: { lastDate: ISODate; intervalYears: number } | null;
    dose?: { number: number; of: number } | null;
  },
): RuleResult {
  const after = opts.after ?? null;
  const earliest = after ? addYears(after.lastDate, after.intervalYears) : null;
  const dose = opts.dose ?? null;
  const base = { latestDate: null, dose, timing: "normal" as const };

  if (ctx.decision?.kind === "doctor_recommends") {
    return {
      ...base,
      status: startStatus(earliest, ctx.today, ctx.leadMonths),
      dueDate: earliest,
      reason: { kind: "indication", indication: "doctor" },
      source: opts.discussSource,
    };
  }

  const birthday = addYears(ctx.person.birthDate, opts.age);
  const age = ageOn(ctx.person.birthDate, ctx.today);
  if (
    ctx.person.answers.chronicIllness &&
    ctx.decision?.kind !== "doctor_not_applicable" &&
    age >= opts.discussFrom &&
    age < opts.age
  ) {
    return {
      ...base,
      status: "discuss",
      dueDate: birthday,
      reason: { kind: "discuss", topic: "chronic", normalAge: opts.age },
      source: opts.discussSource,
    };
  }
  // Verschiebt die frühere Dosis den Termin, nennt die Begründung den Abstand.
  if (after && earliest !== null && earliest > birthday) {
    return {
      ...base,
      status: startStatus(earliest, ctx.today, ctx.leadMonths),
      dueDate: earliest,
      reason: { kind: "after_dose", ...after },
      source: opts.source,
    };
  }
  return {
    ...base,
    status: startStatus(birthday, ctx.today, ctx.leadMonths),
    dueDate: birthday,
    reason: { kind: "age", age: opts.age },
    source: opts.source,
  };
}
