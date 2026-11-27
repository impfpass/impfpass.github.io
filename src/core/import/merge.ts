import type { TransferEntry, Vaccination } from "../model";
import { isPossibleDuplicate } from "./duplicates";

export interface ImportItem {
  entry: TransferEntry;
  /** Die erste vorhandene Impfung, die dieselbe sein könnte. */
  duplicateOf: Vaccination | null;
}

/** Ordnet jedem Eintrag eine mögliche Dublette zu; die Reihenfolge bleibt. */
export function planImport(
  existing: Vaccination[],
  entries: TransferEntry[],
): ImportItem[] {
  return entries.map((entry) => ({
    entry,
    duplicateOf: existing.find((v) => isPossibleDuplicate(v, entry)) ?? null,
  }));
}

export function toVaccinations(
  entries: TransferEntry[],
  ctx: { personId: string; importId: string; now: Date; newId(): string },
): Vaccination[] {
  const stamp = ctx.now.toISOString();
  return entries.map((e) => {
    const v: Vaccination = {
      id: ctx.newId(),
      personId: ctx.personId,
      date: e.date,
      datePrecision: e.datePrecision,
      productId: e.productId,
      label: e.label,
      diseases: e.diseases,
      source: "import",
      importId: ctx.importId,
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (e.batch !== undefined) v.batch = e.batch;
    if (e.doctor !== undefined) v.doctor = e.doctor;
    if (e.note !== undefined) v.note = e.note;
    return v;
  });
}
