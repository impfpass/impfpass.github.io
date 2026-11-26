import { z } from "zod";
import { T } from "@/app/texts";
import { todayISO } from "../dates";
import type { BackupData } from "../storage/repository";
import {
  decisionSchema,
  personSchema,
  settingsSchema,
  vaccinationSchema,
} from "./schemas";

export const BACKUP_FORMAT = "impfpass-backup";
export const BACKUP_VERSION = 1;

export interface BackupFile extends BackupData {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
}

export type BackupErrorCode = "notBackup" | "tooNew" | "corrupt";

/** Die Datei lässt sich nicht als Sicherung lesen. Die Meldung ist für Anwender. */
export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode, options?: ErrorOptions) {
    super(T.backup.errors[code], options);
    this.name = "BackupError";
    this.code = code;
  }
}

const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  createdAt: z.string(),
  persons: z.array(personSchema),
  vaccinations: z.array(vaccinationSchema),
  decisions: z.array(decisionSchema),
  settings: settingsSchema,
});

export function createBackup(data: BackupData, now: Date): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    persons: data.persons,
    vaccinations: data.vaccinations,
    decisions: data.decisions,
    settings: data.settings,
  };
}

export function serializeBackup(b: BackupFile): string {
  return JSON.stringify(b, null, 2);
}

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new BackupError("notBackup", { cause });
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as { format?: unknown }).format !== BACKUP_FORMAT
  ) {
    throw new BackupError("notBackup");
  }
  const version = (raw as { version?: unknown }).version;
  if (typeof version === "number" && version > BACKUP_VERSION) {
    throw new BackupError("tooNew");
  }
  const result = backupFileSchema.safeParse(raw);
  if (!result.success) {
    throw new BackupError("corrupt", { cause: result.error });
  }
  return result.data;
}

/** Dateiname mit dem lokalen Datum, etwa `impfpass-sicherung-2026-11-26.json`. */
export function backupFileName(now: Date): string {
  return `impfpass-sicherung-${todayISO(now)}.json`;
}
