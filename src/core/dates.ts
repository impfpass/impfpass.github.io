import type { DatePrecision, ISODate } from "./model";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * Heutiges Datum in der lokalen Zeitzone. Nicht `toISOString()` verwenden:
 * Das liefert UTC und in Deutschland kurz nach Mitternacht den Vortag.
 */
export function todayISO(now: Date = new Date()): ISODate {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(s: string): boolean {
  const m = ISO_PATTERN.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  // Tag 0 des Folgemonats ist der letzte Tag des Monats. UTC, damit keine
  // Zeitumstellung dazwischenkommt.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/**
 * Länge des Datums-Strings, die bei dieser Genauigkeit zählt: `YYYY`,
 * `YYYY-MM`, `YYYY-MM-DD`. Auch die Übertragung kürzt das Datum so.
 */
export const SIGNIFICANT_LENGTH: Readonly<Record<DatePrecision, number>> = {
  year: 4,
  month: 7,
  day: 10,
};

export function normalizeToPrecision(date: ISODate, p: DatePrecision): ISODate {
  if (p === "year") return `${date.slice(0, 4)}-01-01`;
  if (p === "month") return `${date.slice(0, 7)}-01`;
  return date;
}

export function formatDate(date: ISODate, p: DatePrecision): string {
  const [year, month, day] = date.split("-");
  if (p === "year") return year;
  if (p === "month") return `${month}/${year}`;
  return `${day}.${month}.${year}`;
}

const parts = (date: ISODate): [number, number, number] => {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
};

/** Rechnet in UTC, damit keine Zeitumstellung dazwischenkommt. */
export function addDays(date: ISODate, days: number): ISODate {
  const [y, m, d] = parts(date);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(result.getUTCFullYear(), 4)}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/** Über das Monatsende hinaus wird der letzte Tag des Zielmonats genommen. */
export function addMonths(date: ISODate, months: number): ISODate {
  const [y, m, d] = parts(date);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12; // 0-basiert
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${pad(year, 4)}-${pad(month + 1)}-${pad(Math.min(d, lastDay))}`;
}

/** 29.02. wird zum 28.02., wenn das Zieljahr kein Schaltjahr ist. */
export function addYears(date: ISODate, years: number): ISODate {
  return addMonths(date, years * 12);
}

/** Vollendete Jahre am Stichtag: die größte Zahl n mit addYears(birthDate, n) <= date. */
export function ageOn(birthDate: ISODate, date: ISODate): number {
  let n = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  while (n > 0 && addYears(birthDate, n) > date) n--;
  while (addYears(birthDate, n + 1) <= date) n++;
  return n;
}
