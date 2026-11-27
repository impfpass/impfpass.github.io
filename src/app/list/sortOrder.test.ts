import { nextSort, splitSort } from "./sortOrder";

it("Datum: erstes Antippen neueste zuerst, dann im Wechsel", () => {
  expect(nextSort("product-asc", "date")).toBe("date-desc");
  expect(nextSort("date-desc", "date")).toBe("date-asc");
  expect(nextSort("date-asc", "date")).toBe("date-desc");
});

it("Impfstoff und Krankheit: erstes Antippen A bis Z, dann im Wechsel", () => {
  expect(nextSort("date-desc", "product")).toBe("product-asc");
  expect(nextSort("product-asc", "product")).toBe("product-desc");
  expect(nextSort("product-desc", "product")).toBe("product-asc");
  expect(nextSort("product-desc", "disease")).toBe("disease-asc");
  expect(nextSort("disease-asc", "disease")).toBe("disease-desc");
});

it("Wechsel zu anderem Knopf beginnt wieder mit dessen erster Richtung", () => {
  expect(nextSort("disease-desc", "date")).toBe("date-desc");
  expect(nextSort("date-asc", "disease")).toBe("disease-asc");
});

it("zerlegt die Sortierung in Knopf und Richtung", () => {
  expect(splitSort("date-desc")).toEqual({ key: "date", dir: "desc" });
  expect(splitSort("disease-asc")).toEqual({ key: "disease", dir: "asc" });
});
