import { normalizeListSort, type ListSort } from "./model";

it("übernimmt gültige Sortierungen", () => {
  const all: ListSort[] = [
    "date-desc",
    "date-asc",
    "product-asc",
    "product-desc",
    "disease-asc",
    "disease-desc",
  ];
  for (const s of all) expect(normalizeListSort(s)).toBe(s);
});

it("ältere Werte „product“ und „disease“ bedeuten A bis Z", () => {
  expect(normalizeListSort("product")).toBe("product-asc");
  expect(normalizeListSort("disease")).toBe("disease-asc");
});

it("unbekannte Werte ergeben neueste zuerst", () => {
  expect(normalizeListSort("quatsch")).toBe("date-desc");
  expect(normalizeListSort(undefined)).toBe("date-desc");
});
