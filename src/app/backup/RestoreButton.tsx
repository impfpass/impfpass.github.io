import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatDate, todayISO } from "@/core/dates";
import {
  BackupError,
  MAX_BACKUP_BYTES,
  parseBackup,
  type BackupFile,
} from "@/core/formats/backup";
import { useAppData } from "../data/AppData";
import { T } from "@/texts";

export function RestoreButton() {
  const { person, actions } = useAppData();
  // Ohne Person (Ersteinrichtung) geht beim Übernehmen nichts verloren.
  const empty = person === null;
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Zurücksetzen, damit dieselbe Datei noch einmal gewählt werden kann.
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDone(false);
    if (file.size > MAX_BACKUP_BYTES) {
      setError(T.backup.errors.tooLarge);
      return;
    }
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setError(
        err instanceof BackupError ? err.message : T.backup.errors.notBackup,
      );
    }
  }

  async function confirm() {
    if (!pending) return;
    const backup = pending;
    setPending(null);
    try {
      await actions.restore(backup);
      setDone(true);
    } catch {
      setError(T.backup.restoreFailed);
    }
  }

  const created = pending
    ? formatDate(todayISO(new Date(pending.createdAt)), "day")
    : "";
  const names = pending
    ? pending.persons.map((p) => p.name).filter(Boolean)
    : [];
  const confirmText = empty ? T.backup.confirmTextEmpty : T.backup.confirmText;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => input.current?.click()}
      >
        {T.backup.restore}
      </Button>
      {/* Ohne accept: iOS graut JSON-Dateien sonst teils aus. */}
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={onFile}
        data-testid="restore-input"
      />
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {done && <p role="status">{T.backup.restored}</p>}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {empty ? T.backup.confirmTitleEmpty : T.backup.confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                confirmText(created, names, pending.vaccinations.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>
              {empty ? T.backup.confirmActionEmpty : T.backup.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
