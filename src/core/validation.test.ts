import { validateEntry, type EntryInput } from "./validation";

const birth = "1967-03-15",
  today = "2026-11-26";

const base: EntryInput = {
  date: "2020-05-04",
  datePrecision: "day",
  productId: "boostrix-polio",
  label: "Boostrix Polio",
  diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
};

it("gültiger Eintrag", () => {
  expect(validateEntry(base, birth, today)).toEqual({});
});

it("ohne Datum", () => {
  expect(validateEntry({ ...base, date: "" }, birth, today).date).toBe(
    "Bitte ein Datum angeben.",
  );
  expect(
    validateEntry({ ...base, date: "2020-02-30" }, birth, today).date,
  ).toBe("Bitte ein Datum angeben.");
});

it("Zukunft", () => {
  expect(
    validateEntry({ ...base, date: "2026-11-27" }, birth, today).date,
  ).toBe("Das Datum liegt in der Zukunft.");
});

it("heute ist erlaubt", () => {
  expect(validateEntry({ ...base, date: today }, birth, today)).toEqual({});
});

it("vor Geburt", () => {
  expect(
    validateEntry({ ...base, date: "1967-03-14" }, birth, today).date,
  ).toBe("Das Datum liegt vor deinem Geburtstag.");
});

it("Jahr der Geburt ist erlaubt, wenn nur das Jahr bekannt ist", () => {
  expect(
    validateEntry(
      { ...base, date: "1967-01-01", datePrecision: "year" },
      birth,
      today,
    ),
  ).toEqual({});
});

it("Monat der Geburt ist erlaubt, wenn nur der Monat bekannt ist", () => {
  expect(
    validateEntry(
      { ...base, date: "1967-03-01", datePrecision: "month" },
      birth,
      today,
    ),
  ).toEqual({});
});

it("Genauigkeit gilt auch für die Zukunft", () => {
  expect(
    validateEntry(
      { ...base, date: "2026-11-01", datePrecision: "month" },
      birth,
      today,
    ),
  ).toEqual({});
  expect(
    validateEntry(
      { ...base, date: "2027-01-01", datePrecision: "year" },
      birth,
      today,
    ).date,
  ).toBe("Das Datum liegt in der Zukunft.");
  expect(
    validateEntry(
      { ...base, date: "1966-01-01", datePrecision: "year" },
      birth,
      today,
    ).date,
  ).toBe("Das Datum liegt vor deinem Geburtstag.");
});

it("ohne Impfstoff und ohne Krankheit", () => {
  expect(
    validateEntry({ ...base, productId: null, diseases: [] }, birth, today)
      .product,
  ).toBe(
    "Bitte einen Impfstoff wählen oder mindestens eine Krankheit angeben.",
  );
});

it("Freitext mit Krankheit ist erlaubt", () => {
  expect(
    validateEntry(
      { ...base, productId: null, label: "Tetanus", diseases: ["tetanus"] },
      birth,
      today,
    ),
  ).toEqual({});
});
