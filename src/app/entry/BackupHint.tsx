import { useState } from "react";
import { Button } from "@/components/ui/button";
import { T } from "../texts";
import { useSaveBackup } from "../backup/useSaveBackup";

/** Angebot nach dem Speichern eines Eintrags, eine Sicherung anzulegen. */
export function BackupHint() {
  const { save, busy, failed } = useSaveBackup();
  const [state, setState] = useState<"open" | "done" | "closed">("open");

  if (state === "closed") return null;
  if (state === "done") return <p role="status">{T.backupHint.done}</p>;

  async function now() {
    const result = await save();
    if (result === "shared" || result === "downloaded") setState("done");
  }

  return (
    <section
      aria-labelledby="backup-hint"
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 id="backup-hint" className="text-lg font-semibold">
        {T.backupHint.question}
      </h2>
      <p>{T.backupHint.text}</p>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.backup.saveFailed}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void now()} disabled={busy}>
          {T.backupHint.now}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setState("closed")}
        >
          {T.backupHint.later}
        </Button>
      </div>
    </section>
  );
}
