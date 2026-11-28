import { sha256Hex } from "../formats/sha256";
import type { GtdItem, GtdPayload } from "../formats/gtd";
import type { GtdState, ISODate } from "../model";
import type { GtdReminder } from "./reminders";

/** Was noch nicht im GTD ist: neue oder geänderte Erinnerungen und weggefallene refs. */
export interface GtdChanges {
  upserts: GtdReminder[];
  cancels: string[];
}

/** Fassung einer Erinnerung; der Tag geht unvorgezogen ein (Plan 4, Entscheidung 4). */
export function contentHash(r: GtdReminder): string {
  return sha256Hex(
    JSON.stringify([r.day, r.title, r.description, r.checklist]),
  ).slice(0, 16);
}

/**
 * Vergleicht die aktuellen Erinnerungen einer Person mit dem, was schon
 * übergeben ist. Ein Stand einer anderen Person zählt wie keiner.
 */
export function pendingChanges(
  reminders: GtdReminder[],
  state: GtdState | null,
  personId: string,
): GtdChanges {
  const own = state?.personId === personId ? state.handedOver : [];
  const known = new Map(own.map((h) => [h.ref, h.contentHash]));
  const current = new Set(reminders.map((r) => r.ref));
  return {
    upserts: reminders.filter((r) => known.get(r.ref) !== contentHash(r)),
    cancels: [...known.keys()].filter((ref) => !current.has(ref)).sort(),
  };
}

/** Stand nach einer Übergabe genau dieser Änderungen. */
export function applyHandover(
  state: GtdState | null,
  personId: string,
  changes: GtdChanges,
  at: string,
): GtdState {
  const byRef = new Map(
    (state?.personId === personId ? state.handedOver : []).map((h) => [
      h.ref,
      h,
    ]),
  );
  for (const ref of changes.cancels) byRef.delete(ref);
  for (const r of changes.upserts) {
    byRef.set(r.ref, { ref: r.ref, contentHash: contentHash(r), at });
  }
  return {
    personId,
    handedOver: [...byRef.values()].sort((a, b) =>
      a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0,
    ),
  };
}

/** Übergabe Version 1; sofort und vergangene Tage werden zu `today`. */
export function buildPayload(
  changes: GtdChanges,
  today: ISODate,
  now: Date,
): GtdPayload {
  const items: GtdItem[] = [
    ...changes.upserts.map((r): GtdItem => ({
      ref: r.ref,
      op: "upsert",
      title: r.title,
      date: r.day === null || r.day < today ? today : r.day,
      time: null,
      description: r.description,
      checklist: r.checklist,
    })),
    ...changes.cancels.map((ref): GtdItem => ({ ref, op: "cancel" })),
  ];
  return {
    format: "impfpass-gtd",
    version: 1,
    created: now.toISOString(),
    items,
  };
}
