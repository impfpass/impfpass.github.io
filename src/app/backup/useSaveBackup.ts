import { useState } from "react";
import { createBackup } from "@/core/formats/backup";
import { useAppData } from "../data/AppData";
import { saveBackupFile, type SaveResult } from "./saveBackup";

/**
 * Sicherung erstellen und ausgeben. Nach Erfolg wird das Datum der letzten
 * Sicherung gespeichert.
 */
export function useSaveBackup() {
  const { settings, actions } = useAppData();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(): Promise<SaveResult | "failed"> {
    setBusy(true);
    setFailed(false);
    try {
      const now = new Date();
      const data = await actions.exportData();
      const result = await saveBackupFile(createBackup(data, now), now);
      if (result !== "cancelled") {
        await actions.saveSettings({
          ...settings,
          lastBackupAt: now.toISOString(),
        });
      }
      return result;
    } catch {
      setFailed(true);
      return "failed";
    } finally {
      setBusy(false);
    }
  }

  return { save, busy, failed };
}
