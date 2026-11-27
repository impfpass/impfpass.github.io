import { T } from "@/texts";
import { DISEASE_IDS, type DiseaseId } from "../catalog/diseases";
import { recognizeDisease } from "../catalog/recognize";

export type RowField = "date" | "label" | "batch" | "doctor" | "diseases";

export interface ParsedRow {
  date: string;
  label: string;
  batch: string;
  doctor: string;
  diseases: DiseaseId[];
  unsure: RowField[];
  hints: string[];
}

export type ChatbotAnswerErrorCode = "noJson" | "noEntries" | "tooLong";

/** Die Antwort des Chatbots lässt sich nicht lesen. Die Meldung ist für Anwender. */
export class ChatbotAnswerError extends Error {
  readonly code: ChatbotAnswerErrorCode;
  constructor(code: ChatbotAnswerErrorCode, options?: ErrorOptions) {
    super(T.pc.chatbotErrors[code], options);
    this.name = "ChatbotAnswerError";
    this.code = code;
  }
}

export const MAX_ANSWER_CHARS = 1_000_000;

/** Namen aus der Anleitung (JSON) auf Felder der Zeile. */
const UNSURE_FIELDS: Readonly<Record<string, RowField>> = {
  date: "date",
  name: "label",
  label: "label",
  batch: "batch",
  doctor: "doctor",
  diseases: "diseases",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function text(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/** Die Liste der Einträge, wenn der Wert eine enthält. */
function entriesOf(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value.some(isRecord) ? value : null;
  if (isRecord(value) && Array.isArray(value.vaccinations)) {
    return value.vaccinations;
  }
  return null;
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Ende des Abschnitts ab `start` (`{` oder `[`); Klammern in Strings zählen nicht. */
function findClosing(s: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Findet die erste Liste von Impfungen: erst der ganze Text, dann jeder Abschnitt. */
function findEntries(s: string): unknown[] | null {
  const whole = entriesOf(tryParse(s.trim()));
  if (whole) return whole;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "{" || c === "[") {
      const end = findClosing(s, i);
      if (end < 0) {
        i++;
        continue;
      }
      const found = entriesOf(tryParse(s.slice(i, end + 1)));
      if (found) return found;
      // Ein Abschnitt ohne Impfungen kann einen weiteren enthalten, daher weiter innen suchen.
    }
    i++;
  }
  return null;
}

function toRow(raw: unknown): ParsedRow | null {
  if (!isRecord(raw)) return null;
  const unsure = new Set<RowField>();
  if (Array.isArray(raw.unsure)) {
    for (const u of raw.unsure) {
      const key = typeof u === "string" ? u.trim() : "";
      // Nur eigene Schlüssel: "constructor" oder "__proto__" sind keine Felder.
      if (Object.hasOwn(UNSURE_FIELDS, key)) unsure.add(UNSURE_FIELDS[key]);
    }
  }
  const found = new Set<DiseaseId>();
  const hints: string[] = [];
  if (Array.isArray(raw.diseases)) {
    for (const d of raw.diseases) {
      const name = text(d);
      if (!name) continue;
      const id = recognizeDisease(name);
      if (id) found.add(id);
      else {
        hints.push(T.pc.hints.diseaseUnknown(name));
        unsure.add("diseases");
      }
    }
  }
  const row: ParsedRow = {
    date: text(raw.date),
    label: text(raw.name),
    batch: text(raw.batch),
    doctor: text(raw.doctor),
    diseases: DISEASE_IDS.filter((id) => found.has(id)),
    unsure: [...unsure],
    hints,
  };
  const empty =
    !row.date &&
    !row.label &&
    !row.batch &&
    !row.doctor &&
    row.diseases.length === 0;
  return empty ? null : row;
}

/**
 * Liest die Antwort des Chatbots: JSON im Text oder in einem Codeblock, auch ein
 * reines Array. Das Datum bleibt Text und wird erst im Entwurf geprüft.
 */
export function parseChatbotAnswer(answer: string): ParsedRow[] {
  if (answer.length > MAX_ANSWER_CHARS) throw new ChatbotAnswerError("tooLong");
  const entries = findEntries(answer);
  if (!entries) throw new ChatbotAnswerError("noJson");
  const rows = entries.flatMap((e) => toRow(e) ?? []);
  if (rows.length === 0) throw new ChatbotAnswerError("noEntries");
  return rows;
}
