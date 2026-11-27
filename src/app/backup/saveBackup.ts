import {
  backupFileName,
  serializeBackup,
  type BackupFile,
} from "@/core/formats/backup";
import { saveFile, type SaveResult } from "@/lib/saveFile";

export type { SaveResult };

/**
 * Gibt die Sicherung als JSON-Datei aus. Auf dem iPhone über das Teilen-Menü
 * (etwa nach „Dateien“), sonst als Download.
 */
export function saveBackupFile(b: BackupFile, now: Date): Promise<SaveResult> {
  const file = new File([serializeBackup(b)], backupFileName(now), {
    type: "application/json",
  });
  return saveFile(file);
}
