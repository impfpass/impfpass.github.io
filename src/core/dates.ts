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
