import { normalizeLabel } from "./catalog/recognize";
import type { Vaccination } from "./model";

interface Seen {
  name: string;
  date: string;
  updatedAt: string;
}

function newer(a: Seen, b: Seen): boolean {
  return a.date !== b.date ? a.date > b.date : a.updatedAt > b.updatedAt;
}

/**
 * Bisher eingetragene Ärzte und Praxen, die zur Eingabe passen.
 *
 * Meist impft dieselbe Praxis, also stehen die zuletzt besuchten vorn. Gleiche
 * Namen in anderer Schreibweise zählen als eine Praxis und erscheinen so, wie
 * sie zuletzt eingetragen wurden. Was schon genau so im Feld steht, fehlt.
 */
export function suggestDoctors(
  vaccinations: readonly Vaccination[],
  query: string,
  limit = 3,
): string[] {
  const byKey = new Map<string, Seen>();
  for (const v of vaccinations) {
    const name = v.doctor?.trim();
    if (!name) continue;
    const key = normalizeLabel(name);
    if (!key) continue;
    const seen = { name, date: v.date, updatedAt: v.updatedAt };
    const known = byKey.get(key);
    if (!known || newer(seen, known)) byKey.set(key, seen);
  }

  const q = normalizeLabel(query);
  return [...byKey.entries()]
    .filter(([key]) => key !== q && key.includes(q))
    .map(([, seen]) => seen)
    .sort((a, b) => (newer(a, b) ? -1 : newer(b, a) ? 1 : 0))
    .slice(0, limit)
    .map((seen) => seen.name);
}
