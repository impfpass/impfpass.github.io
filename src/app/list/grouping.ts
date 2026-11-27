import { DISEASE_IDS, DISEASES } from "@/core/catalog/diseases";
import { getProduct } from "@/core/catalog/products";
import { normalizeLabel } from "@/core/catalog/recognize";
import type { Vaccination } from "@/core/model";

export interface Group {
  key: string;
  title: string;
  items: Vaccination[];
}

/**
 * Nach Datum sortiert, ohne die Eingabe zu verändern. Monats- und
 * Jahresangaben stehen am frühesten möglichen Tag. Bei gleichem Datum
 * entscheidet createdAt, danach die ID.
 */
export function sortByDate(
  vs: Vaccination[],
  dir: "asc" | "desc",
): Vaccination[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...vs].sort(
    (x, y) =>
      sign *
      (x.date.localeCompare(y.date) ||
        x.createdAt.localeCompare(y.createdAt) ||
        x.id.localeCompare(y.id)),
  );
}

function productKey(v: Vaccination): string {
  return v.productId ?? `text:${normalizeLabel(v.label)}`;
}

/** Eine Gruppe je Impfstoff bzw. je Freitext-Bezeichnung, alphabetisch. */
export function groupByProduct(vs: Vaccination[]): Group[] {
  const groups = new Map<string, Group>();
  // Neueste zuerst, damit der Titel einer Freitext-Gruppe der jüngsten
  // Schreibweise folgt.
  for (const v of sortByDate(vs, "desc")) {
    const key = productKey(v);
    let group = groups.get(key);
    if (!group) {
      const product = v.productId ? getProduct(v.productId) : undefined;
      group = { key, title: product?.name ?? v.label, items: [] };
      groups.set(key, group);
    }
    group.items.push(v);
  }
  return [...groups.values()].sort((x, y) =>
    x.title.localeCompare(y.title, "de"),
  );
}

/** Eine Gruppe je vorkommender Krankheit, alphabetisch nach deutschem Namen. */
export function groupByDisease(vs: Vaccination[]): Group[] {
  const sorted = sortByDate(vs, "desc");
  return DISEASE_IDS.map((d) => ({
    key: d,
    title: DISEASES[d].name,
    items: sorted.filter((v) => v.diseases.includes(d)),
  }))
    .filter((g) => g.items.length > 0)
    .sort((x, y) => x.title.localeCompare(y.title, "de"));
}
