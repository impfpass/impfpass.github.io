import { shot } from "@/test/rules";
import { T } from "@/texts";
import { otherHint } from "./otherHint";

const H = T.overview.otherHints;

it("Tollwut: Satz nach Zahl der Dosen, gleicher Tag zählt einmal", () => {
  const d1 = shot("2020-01-01", "rabipur");
  const d2 = shot("2020-01-08", "rabipur");
  const d3 = shot("2020-01-29", "rabipur");
  expect(otherHint("rabies", [d1, d2, d3])).toBe(H.rabiesComplete);
  expect(otherHint("rabies", [d1, d2])).toBe(H.rabiesTwo);
  expect(otherHint("rabies", [d1, shot("2020-01-01", "verorab")])).toBe(
    H.rabiesOne,
  );
  expect(otherHint("rabies", [d1])).toBe(H.rabiesOne);
});

it("Tuberkulose: BCG wird nicht mehr empfohlen", () => {
  expect(otherHint("tuberculosis", [shot("1970-05-01", "bcg")])).toBe(
    H.tuberculosis,
  );
});

it("Pocken: Satz nur bei klassischer Pockenimpfung, nicht bei Imvanex allein", () => {
  const classic = shot("1970-05-01", "pocken");
  const imvanex = shot("2022-08-01", "imvanex");
  expect(otherHint("smallpox", [classic])).toBe(H.smallpox);
  expect(otherHint("smallpox", [imvanex])).toBeNull();
  expect(otherHint("smallpox", [imvanex, classic])).toBe(H.smallpox);
});

it("andere Krankheiten ohne Satz", () => {
  expect(
    otherHint("yellow_fever", [shot("2015-01-01", "stamaril")]),
  ).toBeNull();
});

it("Tollwut: drei Dosen mit nur bekanntem Monat zählen einzeln", () => {
  const m = () => shot("2019-01-01", "rabipur", "month");
  expect(otherHint("rabies", [m(), m(), m()])).toBe(H.rabiesComplete);
});
