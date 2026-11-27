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
    /** Frühester Termin wegen einer früheren Dosis, sonst null. */
    earliest?: ISODate | null;
    dose?: { number: number; of: number } | null;
  },
): RuleResult {
  const earliest = opts.earliest ?? null;
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
  const due = earliest !== null && earliest > birthday ? earliest : birthday;
  return {
    ...base,
    status: startStatus(due, ctx.today, ctx.leadMonths),
    dueDate: due,
    reason: { kind: "age", age: opts.age },
    source: opts.source,
  };
}
