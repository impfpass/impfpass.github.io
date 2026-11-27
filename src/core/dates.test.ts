import {
  addDays,
  addMonths,
  addYears,
  ageOn,
  formatDate,
  isValidISODate,
  normalizeToPrecision,
  todayISO,
} from "./dates";

it("todayISO liefert das lokale Datum, nicht UTC", () => {
  expect(todayISO(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-02"); // 00:30 in Berlin
});

it("todayISO füllt Monat und Tag mit Nullen auf", () => {
  expect(todayISO(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
});

it("isValidISODate", () => {
  expect(isValidISODate("2026-02-28")).toBe(true);
  expect(isValidISODate("2026-02-30")).toBe(false);
  expect(isValidISODate("28.02.2026")).toBe(false);
});

it("isValidISODate kennt Schaltjahre und Monatsgrenzen", () => {
  expect(isValidISODate("2024-02-29")).toBe(true);
  expect(isValidISODate("2023-02-29")).toBe(false);
  expect(isValidISODate("2026-13-01")).toBe(false);
  expect(isValidISODate("2026-04-31")).toBe(false);
  expect(isValidISODate("2026-1-05")).toBe(false);
  expect(isValidISODate("")).toBe(false);
});

it("normalizeToPrecision", () => {
  expect(normalizeToPrecision("2016-12-05", "month")).toBe("2016-12-01");
  expect(normalizeToPrecision("2016-12-05", "year")).toBe("2016-01-01");
  expect(normalizeToPrecision("2016-12-05", "day")).toBe("2016-12-05");
});

it("formatDate", () => {
  expect(formatDate("2016-12-05", "day")).toBe("05.12.2016");
  expect(formatDate("2016-12-01", "month")).toBe("12/2016");
  expect(formatDate("2016-01-01", "year")).toBe("2016");
});

it("addMonths hält das Monatsende ein", () => {
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  expect(addMonths("2027-03-01", -6)).toBe("2026-09-01");
  expect(addMonths("2026-08-31", -6)).toBe("2026-02-28");
});

it("addYears am 29. Februar", () => {
  expect(addYears("1964-02-29", 60)).toBe("2024-02-29");
  expect(addYears("1968-02-29", 59)).toBe("2027-02-28");
});

it("addDays über Monats- und Jahreswechsel", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});

it("ageOn am Tag vor und am Geburtstag", () => {
  expect(ageOn("1967-03-01", "2027-02-28")).toBe(59);
  expect(ageOn("1967-03-01", "2027-03-01")).toBe(60);
  expect(ageOn("1968-02-29", "2027-02-27")).toBe(58);
  expect(ageOn("1968-02-29", "2027-02-28")).toBe(59);
});
