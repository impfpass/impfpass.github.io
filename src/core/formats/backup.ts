import { z } from "zod";
import { T } from "@/app/texts";
import { DISEASE_IDS } from "../catalog/diseases";
import { todayISO } from "../dates";
import type { BackupData } from "../storage/repository";
import {
  decisionSchema,
  personSchema,
  settingsSchema,
  timestampSchema,
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
  createdAt: timestampSchema,
  persons: z.array(personSchema),
  vaccinations: z.array(vaccinationSchema),
  decisions: z.array(decisionSchema),
  settings: settingsSchema,
});

export function createBackup(data: BackupData, now: Date): BackupFile {
  const createdAt = now.toISOString();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt,
    persons: data.persons,
    vaccinations: data.vaccinations,
    decisions: data.decisions,
    // Wer die Datei wiederherstellt, hat genau den Stand dieser Sicherung.
    settings: { ...data.settings, lastBackupAt: createdAt },
  };
}

const KNOWN_DISEASES: ReadonlySet<string> = new Set(DISEASE_IDS);

/** Eine neuere App kennt Krankheiten, die diese Version noch nicht kennt. */
function hasUnknownDisease(raw: object): boolean {
  const vaccinations = (raw as { vaccinations?: unknown }).vaccinations;
  if (!Array.isArray(vaccinations)) return false;
  return vaccinations.some((v: unknown) => {
    const diseases = (v as { diseases?: unknown } | null)?.diseases;
    return (
      Array.isArray(diseases) &&
      diseases.some((d) => typeof d === "string" && !KNOWN_DISEASES.has(d))
    );
  });
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
  if (
    (typeof version === "number" && version > BACKUP_VERSION) ||
    hasUnknownDisease(raw)
  ) {
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
