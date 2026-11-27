import type { Notice, RuleState, SnapshotEntry } from "../model";
import { compareVersions } from "./helpers";
import type { Recommendation, RecStatus, Rulebook } from "./types";

const NOT_APPLICABLE: RecStatus[] = [
  "not_applicable",
  "declined",
  "not_needed",
];

/** Schnappschuss der zutreffenden Empfehlungen, sortiert nach id. */
export function snapshotOf(recs: Recommendation[]): SnapshotEntry[] {
  return recs
    .filter((r) => !NOT_APPLICABLE.includes(r.status))
    .map((r) => ({
      id: r.id as string,
      dueDate: r.dueDate,
      dose: r.dose?.number ?? null,
      season: r.timing === "season",
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Vergleicht Vorhandensein, Fälligkeit und Dosis; bei Saison nur das Vorhandensein. */
export function compareSnapshots(
  before: SnapshotEntry[],
  after: SnapshotEntry[],
): { kind: Notice["kind"]; id: string }[] {
  const old = new Map(before.map((e) => [e.id, e]));
  const now = new Map(after.map((e) => [e.id, e]));
  const result: { kind: Notice["kind"]; id: string }[] = [];
  for (const e of before) {
    if (!now.has(e.id)) result.push({ kind: "dropped", id: e.id });
  }
  for (const e of after) {
    const prev = old.get(e.id);
    if (!prev) result.push({ kind: "new", id: e.id });
    else if (
      !(prev.season && e.season) &&
      (prev.dueDate !== e.dueDate || prev.dose !== e.dose)
    ) {
      result.push({ kind: "changed", id: e.id });
    }
  }
  return result;
}

export function nextRuleState(
  prev: RuleState | null,
  personId: string,
  recs: Recommendation[],
  rulebook: Rulebook,
): RuleState {
  const snapshot = snapshotOf(recs);
  if (!prev) {
    return { personId, seenVersion: rulebook.version, snapshot, notices: [] };
  }
  if (compareVersions(rulebook.version, prev.seenVersion) <= 0) {
    return { ...prev, personId, snapshot };
  }
  // Ohne früheren Schnappschuss (etwa unter 18) gäbe es nur „Neu“ für alles:
  // Stand übernehmen, keine Hinweise.
  if (prev.snapshot.length === 0) {
    return { ...prev, personId, seenVersion: rulebook.version, snapshot };
  }
  const fresh: Notice[] = compareSnapshots(prev.snapshot, snapshot).map(
    ({ kind, id }) => {
      let best: Rulebook["changes"][number] | undefined;
      for (const c of rulebook.changes) {
        if (compareVersions(c.version, prev.seenVersion) <= 0) continue;
        if (!c.ids.includes(id)) continue;
        if (!best || compareVersions(c.version, best.version) > 0) best = c;
      }
      return {
        kind,
        recommendationId: id,
        text: best?.text ?? null,
        validSince: best?.validSince ?? null,
      };
    },
  );
  const replaced = new Set(fresh.map((n) => n.recommendationId));
  return {
    personId,
    seenVersion: rulebook.version,
    snapshot,
    notices: [
      ...prev.notices.filter((n) => !replaced.has(n.recommendationId)),
      ...fresh,
    ],
  };
}
