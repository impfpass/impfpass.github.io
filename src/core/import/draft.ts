import { diseaseLabel, type DiseaseId } from "../catalog/diseases";
import { getProduct } from "../catalog/products";
import { recognizeProduct } from "../catalog/recognize";
import { MAX_TEXT_LENGTH, MAX_TRANSFER_ENTRIES } from "../formats/transfer";
import type {
  Draft,
  DraftRow,
  ISODate,
  RowField,
  TransferEntry,
} from "../model";
import { dateRangeIssue } from "../validation";
import type { ParsedRow } from "./chatbot";
import { isPossibleDuplicate } from "./duplicates";
import { parsePassDate } from "./passDate";

// Die Typen liegen in `core/model.ts`, damit Formate und Speicher nicht aus `core/import` lesen.
export type { Draft, DraftRow };

export type TextField = "label" | "batch" | "doctor" | "note";

export type RowIssue =
  | { kind: "dateMissing"; blocking: true }
  | { kind: "dateInvalid"; blocking: true }
  | { kind: "dateFuture"; blocking: true }
  | { kind: "dateBeforeBirth"; blocking: true }
  | { kind: "noDisease"; blocking: true }
  | { kind: "textTooLong"; fields: TextField[]; blocking: true }
  | { kind: "productFuzzy"; read: string; productId: string; blocking: false }
  | { kind: "productAmbiguous"; candidates: string[]; blocking: false }
  | { kind: "productUnknown"; blocking: false }
  | { kind: "unsure"; fields: RowField[]; blocking: false }
  | { kind: "hint"; text: string; blocking: false }
  | { kind: "duplicate"; otherRow: number; blocking: false };

export function emptyDraft(now: Date): Draft {
  return { version: 1, birthDate: "", rows: [], updatedAt: now.toISOString() };
}

export function newRow(id: string): DraftRow {
  return {
    id,
    date: "",
    label: "",
    productId: null,
    diseases: [],
    batch: "",
    doctor: "",
    note: "",
    unsure: [],
    hints: [],
    reviewed: false,
  };
}

/*
 * Ändern sich Datum, Impfstoff oder Krankheiten, gilt „Hinweise geprüft“ nicht
 * mehr: Die Hinweise können neu sein. Charge, Arzt und Notiz behalten es.
 */

export function withDate(row: DraftRow, date: string): DraftRow {
  return { ...row, date, reviewed: false };
}

/**
 * Das Label wie eingegeben; Impfstoff und Krankheiten folgen der Erkennung.
 * Passt der neue Name auf keinen Impfstoff mehr, gehören die Krankheiten des
 * bisherigen nicht dazu. Nur von Hand gewählte bleiben.
 */
export function withLabel(row: DraftRow, label: string): DraftRow {
  const r = recognizeProduct(label);
  if (r.kind === "exact" || r.kind === "fuzzy") {
    return {
      ...row,
      label,
      productId: r.product.id,
      diseases: [...r.product.diseases],
      reviewed: false,
    };
  }
  return {
    ...row,
    label,
    productId: null,
    diseases: row.productId === null ? row.diseases : [],
    reviewed: false,
  };
}

export function withProduct(row: DraftRow, productId: string): DraftRow {
  const product = getProduct(productId);
  if (!product) return row;
  return {
    ...row,
    label: product.name,
    productId: product.id,
    diseases: [...product.diseases],
    reviewed: false,
  };
}

/** Krankheiten wählt man nur von Hand, wenn es keinen Impfstoff gibt. */
export function withDiseases(row: DraftRow, diseases: DiseaseId[]): DraftRow {
  if (row.productId !== null) return row;
  return { ...row, diseases, reviewed: false };
}

export function rowFromParsed(p: ParsedRow, id: string): DraftRow {
  return withLabel(
    {
      ...newRow(id),
      date: p.date,
      batch: p.batch,
      doctor: p.doctor,
      diseases: [...p.diseases],
      unsure: [...p.unsure],
      hints: [...p.hints],
    },
    p.label,
  );
}

type BirthCheck =
  { state: "empty" | "invalid" | "future" } | { state: "ok"; date: ISODate };

/** Das Geburtsdatum gilt nur mit Tag. */
function checkBirth(raw: string, today: ISODate): BirthCheck {
  const d = parsePassDate(raw, today);
  if (d === "empty" || d === "invalid") return { state: d };
  if (d.precision !== "day") return { state: "invalid" };
  return d.date > today ? { state: "future" } : { state: "ok", date: d.date };
}

export function checkBirthDate(
  raw: string,
  today: ISODate,
): "ok" | "empty" | "invalid" | "future" {
  return checkBirth(raw, today).state;
}

function rowIssues(
  row: DraftRow,
  date: ReturnType<typeof parsePassDate>,
  today: ISODate,
  birth: ISODate | null,
): RowIssue[] {
  const issues: RowIssue[] = [];

  if (date === "empty") issues.push({ kind: "dateMissing", blocking: true });
  else if (date === "invalid") {
    issues.push({ kind: "dateInvalid", blocking: true });
  } else {
    const range = dateRangeIssue(date.date, date.precision, birth, today);
    if (range === "future") {
      issues.push({ kind: "dateFuture", blocking: true });
    } else if (range === "beforeBirth") {
      issues.push({ kind: "dateBeforeBirth", blocking: true });
    }
  }

  if (row.productId === null && row.diseases.length === 0) {
    issues.push({ kind: "noDisease", blocking: true });
  }

  const tooLong = (
    [
      ["label", row.label],
      ["batch", row.batch],
      ["doctor", row.doctor],
      ["note", row.note],
    ] as const
  )
    .filter(([, v]) => v.trim().length > MAX_TEXT_LENGTH)
    .map(([k]) => k);
  if (tooLong.length > 0) {
    issues.push({ kind: "textTooLong", fields: tooLong, blocking: true });
  }

  const label = row.label.trim();
  const rec = recognizeProduct(label);
  if (row.productId !== null) {
    if (rec.kind === "fuzzy" && rec.product.id === row.productId) {
      issues.push({
        kind: "productFuzzy",
        read: label,
        productId: row.productId,
        blocking: false,
      });
    }
  } else if (rec.kind === "ambiguous") {
    issues.push({
      kind: "productAmbiguous",
      candidates: rec.candidates.map((p) => p.name),
      blocking: false,
    });
  } else if (label && row.diseases.length > 0) {
    issues.push({ kind: "productUnknown", blocking: false });
  }

  if (row.unsure.length > 0) {
    issues.push({ kind: "unsure", fields: row.unsure, blocking: false });
  }
  for (const text of row.hints) {
    issues.push({ kind: "hint", text, blocking: false });
  }
  return issues;
}

/**
 * Fehler und Hinweise je Zeile, Schlüssel ist die Zeilen-ID. Bei `reviewed`
 * bleiben nur die Fehler.
 */
export function checkDraft(
  draft: Draft,
  today: ISODate,
): Map<string, RowIssue[]> {
  const b = checkBirth(draft.birthDate, today);
  const birth = b.state === "ok" ? b.date : null;
  const result = new Map<string, RowIssue[]>();
  const dated = draft.rows.map((row) => {
    const d = parsePassDate(row.date, today);
    result.set(row.id, rowIssues(row, d, today, birth));
    return typeof d === "object"
      ? { date: d.date, datePrecision: d.precision, diseases: row.diseases }
      : null;
  });

  dated.forEach((a, i) => {
    if (!a) return;
    dated.forEach((b, j) => {
      if (i === j || !b || !isPossibleDuplicate(a, b)) return;
      result
        .get(draft.rows[i].id)
        ?.push({ kind: "duplicate", otherRow: j + 1, blocking: false });
    });
  });

  for (const row of draft.rows) {
    if (row.reviewed) {
      result.set(
        row.id,
        (result.get(row.id) ?? []).filter((issue) => issue.blocking),
      );
    }
  }
  return result;
}

/**
 * Die Bezeichnung für die Übertragung. Ein unscharf erkannter Name ist meist
 * ein Lesefehler des Chatbots; dann gilt der Name des erkannten Impfstoffs.
 */
function entryLabel(row: DraftRow): string {
  const label = row.label.trim();
  if (!label) return diseaseLabel(row.diseases);
  if (row.productId !== null) {
    const rec = recognizeProduct(label);
    if (rec.kind === "fuzzy" && rec.product.id === row.productId) {
      return rec.product.name;
    }
  }
  return label;
}

/** Die Einträge für die Übertragung. Wirft, solange eine Zeile einen Fehler hat. */
export function draftToEntries(draft: Draft, today: ISODate): TransferEntry[] {
  if (draft.rows.length > MAX_TRANSFER_ENTRIES) {
    throw new Error(
      `Too many rows: ${draft.rows.length}, at most ${MAX_TRANSFER_ENTRIES}.`,
    );
  }
  const issues = checkDraft(draft, today);
  const blocked = draft.rows.some((r) =>
    issues.get(r.id)?.some((i) => i.blocking),
  );
  if (blocked) throw new Error("Draft still has blocking errors.");

  return draft.rows.map((row) => {
    const date = parsePassDate(row.date, today);
    if (typeof date !== "object") throw new Error("Row has no valid date.");
    const entry: TransferEntry = {
      date: date.date,
      datePrecision: date.precision,
      productId: row.productId,
      label: entryLabel(row),
      diseases: [...row.diseases],
    };
    const batch = row.batch.trim();
    const doctor = row.doctor.trim();
    const note = row.note.trim();
    if (batch) entry.batch = batch;
    if (doctor) entry.doctor = doctor;
    if (note) entry.note = note;
    return entry;
  });
}
