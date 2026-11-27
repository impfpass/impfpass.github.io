import type { ISODate, TransferEntry, Vaccination } from "../model";
import { dateRangeIssue } from "../validation";
import { isPossibleDuplicate } from "./duplicates";

export interface ImportItem {
  entry: TransferEntry;
  /** Die erste vorhandene Impfung, die dieselbe sein könnte. */
  duplicateOf: Vaccination | null;
  /** Datum vor dem Geburtsdatum oder in der Zukunft, wie bei `validateEntry`. */
  dateIssue: "future" | "beforeBirth" | null;
}

/**
 * Ordnet jedem Eintrag eine mögliche Dublette zu und prüft das Datum gegen
 * Geburtsdatum und heute; die Reihenfolge bleibt.
 */
export function planImport(
  existing: Vaccination[],
  entries: TransferEntry[],
  birthDate: ISODate | null,
  today: ISODate,
): ImportItem[] {
  return entries.map((entry) => ({
    entry,
    duplicateOf: existing.find((v) => isPossibleDuplicate(v, entry)) ?? null,
    dateIssue: dateRangeIssue(
      entry.date,
      entry.datePrecision,
      birthDate,
      today,
    ),
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

/**
 * Welche vorhandene Impfung ein gewählter Eintrag ersetzt: je vorhandener
 * Impfung der erste gewählte Eintrag, der sie als mögliche Dublette hat.
 * Weitere Einträge mit derselben Dublette kommen neu dazu, damit keine
 * Impfung eine andere überschreibt.
 */
export function replacementTargets(
  chosen: readonly ImportItem[],
): Map<ImportItem, Vaccination> {
  const targets = new Map<ImportItem, Vaccination>();
  const taken = new Set<string>();
  for (const item of chosen) {
    const old = item.duplicateOf;
    if (!old || taken.has(old.id)) continue;
    taken.add(old.id);
    targets.set(item, old);
  }
  return targets;
}

/**
 * Die zu speichernden Impfungen der gewählten Einträge. Ersetzt ein Eintrag
 * eine vorhandene Impfung, behält sie ihre ID und ihr Anlagedatum; die
 * Angaben vom PC gelten, Charge, Arzt und Notiz bleiben, wenn der PC-Eintrag
 * keine hat, ein genaueres Datum bleibt ebenso.
 */
export function resolveImport(
  chosen: readonly ImportItem[],
  ctx: { personId: string; importId: string; now: Date; newId(): string },
): { vaccinations: Vaccination[]; replaced: number } {
  const targets = replacementTargets(chosen);
  const fresh = toVaccinations(
    chosen.map((item) => item.entry),
    ctx,
  );
  const vaccinations = fresh.map((v, i) => {
    const old = targets.get(chosen[i]);
    return old ? replaceWith(old, v) : v;
  });
  return { vaccinations, replaced: targets.size };
}

const PRECISION_RANK = { year: 0, month: 1, day: 2 } as const;

function replaceWith(old: Vaccination, fresh: Vaccination): Vaccination {
  const v: Vaccination = {
    ...fresh,
    id: old.id,
    personId: old.personId,
    createdAt: old.createdAt,
  };
  // Als mögliche Dublette stimmen beide Daten in der gröberen Genauigkeit
  // überein; das genauere geht nicht verloren.
  if (PRECISION_RANK[old.datePrecision] > PRECISION_RANK[fresh.datePrecision]) {
    v.date = old.date;
    v.datePrecision = old.datePrecision;
  }
  for (const key of ["batch", "doctor", "note"] as const) {
    if (v[key] === undefined && old[key] !== undefined) v[key] = old[key];
  }
  return v;
}
