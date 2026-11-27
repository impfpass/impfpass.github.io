import { isValidISODate } from "../dates";
import type { DatePrecision, ISODate } from "../model";

export type PassDate = { date: ISODate; precision: DatePrecision };

const pad = (n: number) => String(n).padStart(2, "0");

// Unleserliche Stellen schreibt man als ?, x oder _.
const UNREADABLE = /[?x_]/i;
const TOKEN = String.raw`[\d?x_]{1,2}`;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const YEAR = /^\d{4}$/;
const DAY_FIRST = new RegExp(
  String.raw`^(${TOKEN})\s*\.\s*(${TOKEN})\s*\.\s*(\d{4}|\d{2})$`,
  "i",
);
const MONTH_YEAR = /^(\d{1,2})\s*[./]\s*(\d{4})$/;

/** Zweistellig: bis zum laufenden Jahr 20yy, darüber 19yy. */
function fullYear(digits: string, today: ISODate): number {
  if (digits.length === 4) return Number(digits);
  const yy = Number(digits);
  return yy <= Number(today.slice(2, 4)) ? 2000 + yy : 1900 + yy;
}

function build(
  y: number,
  m: number,
  d: number,
  precision: DatePrecision,
): PassDate | "invalid" {
  const date = `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;
  return isValidISODate(date) ? { date, precision } : "invalid";
}

/**
 * Liest ein Datum, wie es im Papierpass steht. Unscharfe Angaben ergeben den
 * frühesten Tag mit entsprechender Genauigkeit („12.2016“ → 2016-12-01, Monat).
 */
export function parsePassDate(
  raw: string,
  today: ISODate,
): PassDate | "empty" | "invalid" {
  const s = raw.trim();
  if (!s) return "empty";

  let m = ISO_DAY.exec(s);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]), "day");

  m = ISO_MONTH.exec(s);
  if (m) return build(Number(m[1]), Number(m[2]), 1, "month");

  if (YEAR.test(s)) return build(Number(s), 1, 1, "year");

  m = MONTH_YEAR.exec(s);
  if (m) return build(Number(m[2]), Number(m[1]), 1, "month");

  m = DAY_FIRST.exec(s);
  if (m) {
    const [, day, month, yearDigits] = m;
    const year = fullYear(yearDigits, today);
    const dayUnknown = UNREADABLE.test(day);
    const monthUnknown = UNREADABLE.test(month);
    if (monthUnknown) {
      // Ohne Monat ist auch ein bekannter Tag wertlos.
      return dayUnknown ? build(year, 1, 1, "year") : "invalid";
    }
    if (dayUnknown) return build(year, Number(month), 1, "month");
    return build(year, Number(month), Number(day), "day");
  }

  return "invalid";
}
