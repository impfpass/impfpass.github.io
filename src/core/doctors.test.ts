import { testVaccination } from "@/test/helpers";
import { suggestDoctors } from "./doctors";

const shots = [
  testVaccination({ id: "a", date: "2019-03-01", doctor: "Praxis Dr. Muster" }),
  testVaccination({
    id: "b",
    date: "2023-10-12",
    doctor: "Hausarztpraxis Nord",
  }),
  testVaccination({ id: "c", date: "2021-06-20", doctor: "Impfzentrum Messe" }),
  testVaccination({ id: "d", date: "2024-11-02", doctor: "praxis dr. muster" }),
  testVaccination({ id: "e", date: "2015-01-15", doctor: "Betriebsarzt" }),
  testVaccination({ id: "f", date: "2025-02-01" }),
  testVaccination({ id: "g", date: "2025-03-01", doctor: "   " }),
];

it("ohne Eingabe: die zuletzt besuchten zuerst, höchstens drei", () => {
  expect(suggestDoctors(shots, "")).toEqual([
    "praxis dr. muster",
    "Hausarztpraxis Nord",
    "Impfzentrum Messe",
  ]);
});

it("jede Praxis nur einmal, in der Schreibweise des neuesten Eintrags", () => {
  const names = suggestDoctors(shots, "", 10);
  expect(names.filter((n) => n.toLowerCase().includes("muster"))).toEqual([
    "praxis dr. muster",
  ]);
  expect(names).toHaveLength(4);
});

it("filtert ohne Rücksicht auf Groß- und Kleinschreibung, Punkte und Leerzeichen", () => {
  expect(suggestDoctors(shots, "dr Muster")).toEqual(["praxis dr. muster"]);
  expect(suggestDoctors(shots, "NORD")).toEqual(["Hausarztpraxis Nord"]);
  expect(suggestDoctors(shots, "praxis")).toEqual([
    "praxis dr. muster",
    "Hausarztpraxis Nord",
  ]);
});

it("schlägt nicht vor, was schon genau so im Feld steht", () => {
  expect(suggestDoctors(shots, "Praxis Dr. Muster")).toEqual([]);
});

it("Umlaute zählen wie ausgeschrieben", () => {
  const v = [testVaccination({ doctor: "Dr. Müller" })];
  expect(suggestDoctors(v, "muell")).toEqual(["Dr. Müller"]);
  expect(suggestDoctors(v, "Mül")).toEqual(["Dr. Müller"]);
});

it("ohne erfasste Ärzte keine Vorschläge", () => {
  expect(suggestDoctors([testVaccination()], "")).toEqual([]);
  expect(suggestDoctors([], "Muster")).toEqual([]);
});
