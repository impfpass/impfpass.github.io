import { DISEASE_IDS, DISEASES, type DiseaseId } from "./diseases";
import { PRODUCTS, type Product } from "./products";

export type Recognition =
  | { kind: "exact"; product: Product }
  | { kind: "fuzzy"; product: Product; distance: number }
  | { kind: "ambiguous"; candidates: Product[] }
  | { kind: "none" };

/**
 * Klein, Umlaute ausgeschrieben, andere Akzente entfernt, nur a–z und 0–9.
 * „Boostrix-Polio“ und „boostrix polio“ ergeben dasselbe.
 */
export function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}

interface Entry {
  key: string;
  product: Product;
}

const ENTRIES: Entry[] = PRODUCTS.flatMap((product) =>
  [product.name, ...product.aliases].map((n) => ({
    key: normalizeLabel(n),
    product,
  })),
);

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

const MAX_DISTANCE = 2;
const MAX_SHARE = 0.25;

export function recognizeProduct(label: string): Recognition {
  const key = normalizeLabel(label);
  if (!key) return { kind: "none" };

  const exact = ENTRIES.find((e) => e.key === key);
  if (exact) return { kind: "exact", product: exact.product };

  // Kleinster Abstand je Impfstoff über Name und Aliase
  const best = new Map<Product, number>();
  for (const e of ENTRIES) {
    const d = levenshtein(key, e.key);
    const known = best.get(e.product);
    if (known === undefined || d < known) best.set(e.product, d);
  }

  // Treffer nur bei Abstand ≤ 2 und ≤ 25 % der Länge der Eingabe
  const limit = Math.min(MAX_DISTANCE, key.length * MAX_SHARE);
  let min = Infinity;
  for (const d of best.values()) min = Math.min(min, d);
  if (min > limit) return { kind: "none" };

  const candidates = [...best].filter(([, d]) => d === min).map(([p]) => p);
  if (candidates.length > 1) return { kind: "ambiguous", candidates };
  return { kind: "fuzzy", product: candidates[0], distance: min };
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "de");

/** Vorschläge zur Eingabe: erst Namensanfang, dann Teilwort, je alphabetisch. */
export function suggestProducts(query: string, limit = 8): Product[] {
  const key = normalizeLabel(query);
  if (!key) return [];
  const starts = new Set<Product>();
  const contains = new Set<Product>();
  for (const e of ENTRIES) {
    if (e.key.startsWith(key)) starts.add(e.product);
    else if (e.key.includes(key)) contains.add(e.product);
  }
  for (const p of starts) contains.delete(p);
  return [...[...starts].sort(byName), ...[...contains].sort(byName)].slice(
    0,
    limit,
  );
}

const DISEASE_ENTRIES: { key: string; id: DiseaseId }[] = DISEASE_IDS.flatMap(
  (id) =>
    [id, DISEASES[id].name, ...DISEASES[id].aliases].map((n) => ({
      key: normalizeLabel(n),
      id,
    })),
);

/** Krankheit aus ID, Name oder Alias; nur exakt (nach `normalizeLabel`), ohne Unschärfe. */
export function recognizeDisease(label: string): DiseaseId | null {
  const key = normalizeLabel(label);
  if (!key) return null;
  return DISEASE_ENTRIES.find((e) => e.key === key)?.id ?? null;
}
