import { testVaccination } from "@/test/helpers";
import { groupByDisease, groupByProduct, sortByDate } from "./grouping";

const a = testVaccination({
  id: "a",
  date: "2016-12-05",
  datePrecision: "day",
});
const b = testVaccination({
  id: "b",
  date: "2016-12-01",
  datePrecision: "month",
});
const c = testVaccination({
  id: "c",
  date: "2016-01-01",
  datePrecision: "year",
});

it("sortiert nach Datum, Monats- und Jahresangaben am frühesten Tag", () => {
  expect(sortByDate([a, b, c], "desc").map((v) => v.id)).toEqual([
    "a",
    "b",
    "c",
  ]);
  expect(sortByDate([a, b, c], "asc").map((v) => v.id)).toEqual([
    "c",
    "b",
    "a",
  ]);
});

it("bei gleichem Datum entscheidet createdAt, die Eingabe bleibt unverändert", () => {
  const first = testVaccination({
    id: "first",
    date: "2020-01-01",
    createdAt: "2026-01-01T10:00:00.000Z",
  });
  const second = testVaccination({
    id: "second",
    date: "2020-01-01",
    createdAt: "2026-01-02T10:00:00.000Z",
  });
  const input = [second, first];
  expect(sortByDate(input, "asc").map((v) => v.id)).toEqual([
    "first",
    "second",
  ]);
  expect(sortByDate(input, "desc").map((v) => v.id)).toEqual([
    "second",
    "first",
  ]);
  expect(input.map((v) => v.id)).toEqual(["second", "first"]);
});

it("Kombi-Impfstoff steht unter jeder seiner Krankheiten, alphabetisch", () => {
  const boostrixPolio = testVaccination();
  const groups = groupByDisease([boostrixPolio]);
  expect(groups.map((g) => g.key)).toEqual([
    "diphtheria",
    "pertussis",
    "polio",
    "tetanus",
  ]);
  expect(groups.map((g) => g.title)).toEqual([
    "Diphtherie",
    "Keuchhusten",
    "Kinderlähmung (Polio)",
    "Tetanus",
  ]);
  for (const g of groups) expect(g.items).toEqual([boostrixPolio]);
});

it("nach Krankheit: Einträge neueste zuerst", () => {
  const old = testVaccination({
    id: "old",
    date: "2010-01-01",
    productId: "td-pur",
    label: "Td-pur",
    diseases: ["tetanus", "diphtheria"],
  });
  const recent = testVaccination({ id: "recent", date: "2020-01-01" });
  const tetanus = groupByDisease([old, recent]).find(
    (g) => g.key === "tetanus",
  )!;
  expect(tetanus.items.map((v) => v.id)).toEqual(["recent", "old"]);
});

it("Freitext-Einträge gruppieren nach Bezeichnung", () => {
  const one = testVaccination({
    id: "one",
    productId: null,
    label: "Tetanus-Impfung",
    diseases: ["tetanus"],
    date: "2001-01-01",
  });
  const two = testVaccination({
    id: "two",
    productId: null,
    label: "tetanus impfung",
    diseases: ["tetanus"],
    date: "2011-01-01",
  });
  const groups = groupByProduct([one, two]);
  expect(groups).toHaveLength(1);
  expect(groups[0].key).toBe("text:tetanusimpfung");
  expect(groups[0].items.map((v) => v.id)).toEqual(["two", "one"]);
});

it("nach Impfstoff: Titel ist der Produktname, Gruppen alphabetisch", () => {
  const shingrix = testVaccination({
    id: "s",
    productId: "shingrix",
    label: "shingrix",
    diseases: ["zoster"],
  });
  const boostrix = testVaccination({ id: "b" });
  const encepur = testVaccination({
    id: "e",
    productId: "encepur",
    label: "Encepur",
    diseases: ["tbe"],
  });
  const groups = groupByProduct([shingrix, boostrix, encepur]);
  expect(groups.map((g) => g.title)).toEqual([
    "Boostrix Polio",
    "Encepur",
    "Shingrix",
  ]);
  expect(groups.map((g) => g.key)).toEqual([
    "boostrix-polio",
    "encepur",
    "shingrix",
  ]);
});

it("Gruppen auch von Z bis A, Einträge bleiben neueste zuerst", () => {
  const shingrix = testVaccination({
    id: "s",
    productId: "shingrix",
    label: "Shingrix",
    diseases: ["zoster"],
  });
  const oldBoostrix = testVaccination({ id: "old", date: "2010-01-01" });
  const newBoostrix = testVaccination({ id: "new", date: "2020-01-01" });
  const all = [oldBoostrix, shingrix, newBoostrix];

  const products = groupByProduct(all, "desc");
  expect(products.map((g) => g.title)).toEqual(["Shingrix", "Boostrix Polio"]);
  expect(products[1].items.map((v) => v.id)).toEqual(["new", "old"]);

  const diseases = groupByDisease(all, "desc");
  expect(diseases.map((g) => g.title)).toEqual([
    "Tetanus",
    "Kinderlähmung (Polio)",
    "Keuchhusten",
    "Gürtelrose",
    "Diphtherie",
  ]);
  expect(diseases[0].items.map((v) => v.id)).toEqual(["new", "old"]);
});
