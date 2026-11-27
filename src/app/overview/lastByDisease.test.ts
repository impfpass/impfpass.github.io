import { testVaccination } from "@/test/helpers";
import { lastByDisease } from "./lastByDisease";

it("neueste Impfung je Krankheit, Kombi-Impfstoff zählt für jede, alphabetisch", () => {
  const tdPur = testVaccination({
    id: "td",
    date: "2010-06-01",
    productId: "td-pur",
    label: "Td-pur",
    diseases: ["tetanus", "diphtheria"],
  });
  const boostrixPolio = testVaccination({ id: "bp", date: "2020-05-04" });

  const result = lastByDisease([tdPur, boostrixPolio]);

  expect(result.map((r) => [r.disease, r.last.id])).toEqual([
    ["diphtheria", "bp"],
    ["pertussis", "bp"],
    ["polio", "bp"],
    ["tetanus", "bp"],
  ]);
});

it("ältere Impfung bleibt für Krankheiten, die die neuere nicht abdeckt", () => {
  const priorix = testVaccination({
    id: "mmr",
    date: "1990-01-01",
    datePrecision: "year",
    productId: "priorix",
    label: "Priorix",
    diseases: ["measles", "mumps", "rubella"],
  });
  const shingrix = testVaccination({
    id: "zoster",
    date: "2025-10-01",
    productId: "shingrix",
    label: "Shingrix",
    diseases: ["zoster"],
  });
  expect(
    lastByDisease([shingrix, priorix]).map((r) => [r.disease, r.last.id]),
  ).toEqual([
    ["zoster", "zoster"],
    ["measles", "mmr"],
    ["mumps", "mmr"],
    ["rubella", "mmr"],
  ]);
});

it("ohne Impfungen leer", () => {
  expect(lastByDisease([])).toEqual([]);
});
