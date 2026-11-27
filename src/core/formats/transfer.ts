import { deflateSync, Inflate } from "fflate";
import { z } from "zod";
import { T } from "@/texts";
import { DISEASE_IDS, diseaseLabel } from "../catalog/diseases";
import { getProduct } from "../catalog/products";
import { isValidISODate, normalizeToPrecision, todayISO } from "../dates";
import type { DatePrecision, TransferEntry, TransferPayload } from "../model";
import { decodeBase45, encodeBase45 } from "./base45";
import { crc32 } from "./crc32";
import { diseaseIdSchema, timestampSchema } from "./schemas";

/**
 * Übertragung vom PC aufs Handy (Spec 8.2): kompaktes JSON, mit deflate
 * gepackt, in Base45 geschrieben und auf Teilzeilen verteilt. Eine Teilzeile:
 * `IP:<Version>:<n>/<gesamt>:<ID>:<Base45>:<CRC-32>`. Die Prüfsumme gilt über
 * die gepackten Bytes und steht am Ende, damit kein Leerzeichen am Zeilenende
 * verloren gehen kann.
 */

/** Datenzeichen je QR-Code. Für Datei und Text gibt es keine Grenze. */
export const QR_PART_CHARS = 700;

/** Größer wird keine echte Übertragung; schützt beim Entpacken vor Datenbomben. */
export const MAX_TRANSFER_BYTES = 1_000_000;

const TRANSFER_VERSION = 1;
const MAX_PARTS = 99;
const MAX_ENTRIES = 2000;
const MAX_TEXT = 500;

const ID_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ID_LENGTH = 6;
const ID_PATTERN = /^[0-9A-Z]{6}$/;

/** Base45 kann selbst ":" enthalten, die Prüfsumme steht nach dem letzten. */
const PART_PATTERN =
  /^IP:1:(\d{1,2})\/(\d{1,2}):([0-9A-Z]{6}):(.+):([0-9A-F]{8})$/;

/** Bytes je Schritt beim Entpacken. Aus einem gepackten Byte werden höchstens etwa 1032. */
const INFLATE_STEP = 256;

export type TransferErrorCode =
  "notTransfer" | "otherTransfer" | "tooNew" | "corrupt";

/** Ein Code oder Text lässt sich nicht als Übertragung lesen. Die Meldung ist für Anwender. */
export class TransferError extends Error {
  readonly code: TransferErrorCode;
  constructor(code: TransferErrorCode, options?: ErrorOptions) {
    super(T.transfer.errors[code], options);
    this.name = "TransferError";
    this.code = code;
  }
}

/** Gelesene Teile einer Übertragung, in beliebiger Reihenfolge gescannt. */
export interface TransferCollector {
  id: string;
  total: number;
  crc: string;
  chunks: (string | undefined)[];
}

// Das Datum trägt seine Genauigkeit über die Länge: 2016, 2016-12, 2016-12-05.
const WIRE_DATE_LENGTH: Record<DatePrecision, number> = {
  year: 4,
  month: 7,
  day: 10,
};
const WIRE_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function precisionOf(wireDate: string): DatePrecision {
  if (wireDate.length === WIRE_DATE_LENGTH.year) return "year";
  if (wireDate.length === WIRE_DATE_LENGTH.month) return "month";
  return "day";
}

const wireDateSchema = z
  .string()
  .regex(WIRE_DATE)
  .refine((s) => isValidISODate(normalizeToPrecision(s, precisionOf(s))));
const textSchema = z.string().min(1).max(MAX_TEXT);
/** `0` steht für die Voreinstellung, Nullen am Ende entfallen. */
const orDefault = <S extends z.ZodType>(schema: S) =>
  z.union([z.literal(0), schema]).optional();

// [datum, productId|0, label|0, diseases|0, batch|0, doctor|0, note|0]
const wireEntrySchema = z.tuple([
  wireDateSchema,
  orDefault(z.string().min(1)),
  orDefault(textSchema),
  orDefault(z.array(diseaseIdSchema).min(1)),
  orDefault(textSchema),
  orDefault(textSchema),
  orDefault(textSchema),
]);

const wireSchema = z.object({
  i: z.string().regex(ID_PATTERN),
  c: timestampSchema,
  e: z.array(wireEntrySchema).max(MAX_ENTRIES),
});

type WireEntry = z.infer<typeof wireEntrySchema>;
type WireValue = string | 0 | readonly string[];

function toWire(e: TransferEntry): WireValue[] {
  const product = e.productId ? getProduct(e.productId) : undefined;
  const sameDiseases =
    product !== undefined &&
    product.diseases.length === e.diseases.length &&
    product.diseases.every((d, i) => d === e.diseases[i]);
  const defaultLabel = product ? product.name : diseaseLabel(e.diseases);
  const wire: WireValue[] = [
    e.date.slice(0, WIRE_DATE_LENGTH[e.datePrecision]),
    e.productId || 0,
    // Eine leere Bezeichnung bekommt beim Lesen ebenfalls die Voreinstellung.
    e.label === defaultLabel || e.label === "" ? 0 : e.label,
    sameDiseases ? 0 : e.diseases,
    e.batch || 0,
    e.doctor || 0,
    e.note || 0,
  ];
  while (wire.at(-1) === 0) wire.pop();
  return wire;
}

function fromWire(e: WireEntry): TransferEntry {
  const [date, productId, label, wireDiseases, batch, doctor, note] = e;
  const datePrecision = precisionOf(date);
  const product = productId ? getProduct(productId) : undefined;
  const diseases = wireDiseases || product?.diseases;
  if (!diseases) throw new TransferError("corrupt");
  return {
    date: normalizeToPrecision(date, datePrecision),
    datePrecision,
    productId: productId || null,
    label: label || (product ? product.name : diseaseLabel(diseases)),
    diseases: [...diseases],
    ...(batch && { batch }),
    ...(doctor && { doctor }),
    ...(note && { note }),
  };
}

const KNOWN_DISEASES: ReadonlySet<string> = new Set(DISEASE_IDS);

/** Eine neuere App kennt Impfstoffe oder Krankheiten, die diese Version noch nicht kennt. */
function hasUnknownIds(raw: unknown): boolean {
  const entries = (raw as { e?: unknown } | null)?.e;
  if (!Array.isArray(entries)) return false;
  return entries.some((e: unknown) => {
    if (!Array.isArray(e)) return false;
    const [, productId, , diseases] = e as unknown[];
    return (
      (typeof productId === "string" && getProduct(productId) === undefined) ||
      (Array.isArray(diseases) &&
        diseases.some((d) => typeof d === "string" && !KNOWN_DISEASES.has(d)))
    );
  });
}

function formatCrc(bytes: Uint8Array): string {
  return crc32(bytes).toString(16).toUpperCase().padStart(8, "0");
}

/** Entpackt und bricht ab, sobald mehr als MAX_TRANSFER_BYTES herauskommen. */
function inflateLimited(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const inflater = new Inflate((chunk) => {
    size += chunk.length;
    if (size > MAX_TRANSFER_BYTES) throw new TransferError("corrupt");
    chunks.push(chunk);
  });
  // Inflate entpackt bei jedem push alles bisher Gelieferte. In kleinen
  // Schritten geliefert, wächst die Ausgabe je Schritt höchstens um rund 260 KB.
  for (let start = 0; start < data.length; start += INFLATE_STEP) {
    const end = start + INFLATE_STEP;
    inflater.push(data.subarray(start, end), end >= data.length);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Sechs Zeichen aus 0-9 und A-Z. */
export function newTransferId(): string {
  // 256 ist kein Vielfaches von 36. Die kleine Schieflage stört bei einer ID,
  // die nur Übertragungen auseinanderhält, nicht.
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

/**
 * Teilzeilen mit höchstens `maxChars` Datenzeichen. Mit `Infinity` ist es ein
 * einziger Teil, für Datei und Text.
 */
export function encodeTransfer(
  p: TransferPayload,
  maxChars: number = QR_PART_CHARS,
): string[] {
  if (!ID_PATTERN.test(p.id)) {
    throw new RangeError(`Ungültige Übertragungs-ID: ${p.id}`);
  }
  if (!(maxChars >= 1)) {
    throw new RangeError(`Ungültige Zeichenzahl je Teil: ${maxChars}`);
  }
  const json = JSON.stringify({
    i: p.id,
    c: p.createdAt,
    e: p.entries.map(toWire),
  });
  const bytes = deflateSync(new TextEncoder().encode(json), { level: 9 });
  const crc = formatCrc(bytes);
  const data = encodeBase45(bytes);
  const chunks: string[] = [];
  for (let start = 0; start < data.length; start += maxChars) {
    chunks.push(data.slice(start, start + maxChars));
  }
  if (chunks.length > MAX_PARTS) {
    throw new RangeError(`Zu viele Teile: ${chunks.length}`);
  }
  return chunks.map(
    (chunk, i) =>
      `IP:${TRANSFER_VERSION}:${i + 1}/${chunks.length}:${p.id}:${chunk}:${crc}`,
  );
}

interface Part {
  n: number;
  total: number;
  id: string;
  data: string;
  crc: string;
}

function parsePart(line: string): Part {
  // Die Version zuerst: Eine neuere Version darf die Zeile anders aufbauen.
  const version = /^IP:(\d+):/.exec(line);
  if (!version) throw new TransferError("notTransfer");
  if (Number(version[1]) > TRANSFER_VERSION) throw new TransferError("tooNew");
  const m = PART_PATTERN.exec(line);
  if (!m) throw new TransferError("notTransfer");
  const n = Number(m[1]);
  const total = Number(m[2]);
  if (n < 1 || n > total) throw new TransferError("notTransfer");
  return { n, total, id: m[3], data: m[4], crc: m[5] };
}

/**
 * Nimmt eine gescannte Teilzeile auf. `null` beginnt eine neue Übertragung.
 * Der übergebene Sammler bleibt unverändert.
 */
export function addPart(
  c: TransferCollector | null,
  line: string,
): { collector: TransferCollector; added: boolean } {
  const part = parsePart(line);
  const collector: TransferCollector = c ?? {
    id: part.id,
    total: part.total,
    crc: part.crc,
    chunks: new Array<string | undefined>(part.total).fill(undefined),
  };
  if (part.id !== collector.id) throw new TransferError("otherTransfer");
  if (part.total !== collector.total || part.crc !== collector.crc) {
    throw new TransferError("corrupt");
  }
  const known = collector.chunks[part.n - 1];
  if (known !== undefined) {
    if (known !== part.data) throw new TransferError("corrupt");
    return { collector, added: false };
  }
  const chunks = [...collector.chunks];
  chunks[part.n - 1] = part.data;
  return { collector: { ...collector, chunks }, added: true };
}

/** Nummern der fehlenden Teile, 1-basiert. */
export function missingParts(c: TransferCollector): number[] {
  return c.chunks.flatMap((chunk, i) => (chunk === undefined ? [i + 1] : []));
}

function unpack(c: TransferCollector): unknown {
  try {
    const bytes = decodeBase45(c.chunks.join(""));
    if (formatCrc(bytes) !== c.crc) throw new TransferError("corrupt");
    const json = new TextDecoder("utf-8", { fatal: true }).decode(
      inflateLimited(bytes),
    );
    return JSON.parse(json);
  } catch (cause) {
    if (cause instanceof TransferError) throw cause;
    throw new TransferError("corrupt", { cause });
  }
}

/** Setzt eine vollständige Übertragung zusammen und prüft sie. */
export function decodeCollected(c: TransferCollector): TransferPayload {
  const missing = missingParts(c);
  if (missing.length > 0) {
    throw new Error(`Übertragung unvollständig, es fehlt Teil ${missing}`);
  }
  const raw = unpack(c);
  if (hasUnknownIds(raw)) throw new TransferError("tooNew");
  const result = wireSchema.safeParse(raw);
  if (!result.success) {
    throw new TransferError("corrupt", { cause: result.error });
  }
  if (result.data.i !== c.id) throw new TransferError("corrupt");
  return {
    id: result.data.i,
    createdAt: result.data.c,
    entries: result.data.e.map(fromWire),
  };
}

/**
 * Liest eingefügten Text oder eine Datei mit einer oder mehreren Teilzeilen.
 * Leerzeilen und fremde Zeilen, etwa aus einer E-Mail, werden übersprungen.
 */
export function readTransferText(
  text: string,
):
  | { payload: TransferPayload }
  | { collector: TransferCollector; missing: number[] } {
  let collector: TransferCollector | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      collector = addPart(collector, line).collector;
    } catch (e) {
      if (e instanceof TransferError && e.code === "notTransfer") continue;
      throw e;
    }
  }
  if (!collector) throw new TransferError("notTransfer");
  const missing = missingParts(collector);
  if (missing.length > 0) return { collector, missing };
  return { payload: decodeCollected(collector) };
}

/** Dateiname mit dem lokalen Datum, etwa `impfpass-uebertragung-2026-11-27.txt`. */
export function transferFileName(now: Date): string {
  return `impfpass-uebertragung-${todayISO(now)}.txt`;
}
