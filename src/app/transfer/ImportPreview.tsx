import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { diseaseLabel } from "@/core/catalog/diseases";
import { formatDate } from "@/core/dates";
import type { ImportItem } from "@/core/import/merge";
import type { TransferEntry } from "@/core/model";
import { T } from "@/texts";

/**
 * Vorschau einer Übertragung. Mögliche Dubletten sind abgewählt und lassen
 * sich wieder anwählen (Spec 8.2). Scheitert `onImport`, bleibt die Auswahl.
 */
export function ImportPreview({
  items,
  onImport,
  onCancel,
}: {
  items: ImportItem[];
  onImport(entries: TransferEntry[]): Promise<void>;
  onCancel(): void;
}) {
  const id = useId();
  const [chosen, setChosen] = useState(() =>
    items.map((item) => item.duplicateOf === null),
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const count = chosen.filter(Boolean).length;
  const duplicates = items.filter((item) => item.duplicateOf).length;

  function toggle(index: number, checked: boolean) {
    setChosen((c) => c.map((value, i) => (i === index ? checked : value)));
  }

  async function submit() {
    setBusy(true);
    setFailed(false);
    try {
      await onImport(
        items.filter((_, i) => chosen[i]).map((item) => item.entry),
      );
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p>{T.transfer.preview.summary(items.length, duplicates)}</p>
      <ul aria-label={T.transfer.preview.label} className="flex flex-col gap-3">
        {items.map(({ entry, duplicateOf }, i) => (
          <li key={i}>
            <label className="flex min-h-11 items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-primary"
                checked={chosen[i]}
                onChange={(e) => toggle(i, e.target.checked)}
                aria-labelledby={`${id}-${i}-title`}
                aria-describedby={`${id}-${i}-details`}
              />
              <span className="flex min-w-0 flex-col">
                <span id={`${id}-${i}-title`} className="flex flex-col">
                  <span className="tabular-nums">
                    {formatDate(entry.date, entry.datePrecision)}
                  </span>{" "}
                  <span className="font-medium break-words">{entry.label}</span>
                </span>
                <span id={`${id}-${i}-details`} className="flex flex-col">
                  <span className="text-muted-foreground">
                    {diseaseLabel(entry.diseases)}
                  </span>
                  {duplicateOf && (
                    <span>
                      {T.transfer.preview.duplicate(
                        duplicateOf.label,
                        formatDate(duplicateOf.date, duplicateOf.datePrecision),
                      )}
                    </span>
                  )}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          disabled={count === 0 || busy}
          onClick={() => void submit()}
        >
          {T.transfer.preview.import(count)}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          {T.common.cancel}
        </Button>
      </div>
    </div>
  );
}
