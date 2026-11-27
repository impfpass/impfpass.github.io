import type { ListSort } from "@/core/model";

export type SortKey = "date" | "product" | "disease";
export type SortDir = "asc" | "desc";

export function splitSort(s: ListSort): { key: SortKey; dir: SortDir } {
  const [key, dir] = s.split("-") as [SortKey, SortDir];
  return { key, dir };
}

/**
 * Sortierung nach dem Antippen eines Knopfs. Beim ersten Antippen steht beim
 * Datum die neueste Impfung oben, bei Impfstoff und Krankheit A bis Z.
 * Erneutes Antippen desselben Knopfs dreht die Richtung um.
 */
export function nextSort(current: ListSort, key: SortKey): ListSort {
  const now = splitSort(current);
  if (now.key === key) return `${key}-${now.dir === "asc" ? "desc" : "asc"}`;
  return key === "date" ? "date-desc" : `${key}-asc`;
}
