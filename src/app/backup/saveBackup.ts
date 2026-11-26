import {
  backupFileName,
  serializeBackup,
  type BackupFile,
} from "@/core/formats/backup";

export type SaveResult = "shared" | "downloaded" | "cancelled";

/**
 * Gibt die Sicherung als JSON-Datei aus. Auf dem iPhone über das Teilen-Menü
 * (etwa nach „Dateien“), sonst als Download.
 */
export async function saveBackupFile(
  b: BackupFile,
  now: Date,
): Promise<SaveResult> {
  const name = backupFileName(now);
  const file = new File([serializeBackup(b)], name, {
    type: "application/json",
  });

  if (
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: name });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Andere Fehler (etwa NotAllowedError): auf den Download ausweichen.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    // Erst nach dem Start des Downloads freigeben.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return "downloaded";
}
