import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { diseaseLabel } from "@/core/catalog/diseases";
import { formatDate } from "@/core/dates";
import { type ImportItem, replacementTargets } from "@/core/import/merge";
import { T } from "@/texts";

/**
 * Vorschau einer Übertragung. Mögliche Dubletten und Daten vor dem
 * Geburtsdatum oder in der Zukunft sind abgewählt und lassen sich wieder
 * anwählen (Spec 8.2). Eine angewählte Dublette ersetzt den vorhandenen
 * Eintrag. Scheitert `onImport`, bleibt die Auswahl.
 */
export function ImportPreview({
  items,
  onImport,
  onCancel,
}: {
  items: ImportItem[];
  onImport(chosen: ImportItem[]): Promise<void>;
  onCancel(): void;
}) {
  const id = useId();
  const [chosen, setChosen] = useState(() =>
    items.map((item) => item.duplicateOf === null && item.dateIssue === null),
  );
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  // Die Vorschau löst das Sammeln ab: Der Fokus geht auf die Zusammenfassung,
  // damit Screenreader sie vorlesen.
  useEffect(() => {
    summaryRef.current?.focus();
  }, []);
  const count = chosen.filter(Boolean).length;
  const duplicates = items.filter((item) => item.duplicateOf).length;
  const targets = replacementTargets(items.filter((_, i) => chosen[i]));

  function toggle(index: number, checked: boolean) {
    setChosen((c) => c.map((value, i) => (i === index ? checked : value)));
  }

  async function submit() {
    setBusy(true);
    setFailed(false);
    try {
      await onImport(items.filter((_, i) => chosen[i]));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p ref={summaryRef} tabIndex={-1} className="outline-none">
          {T.transfer.preview.summary(items.length, duplicates)}
        </p>
        {duplicates > 0 && <p>{T.transfer.preview.replaceHint}</p>}
      </div>
      <ul aria-label={T.transfer.preview.label} className="flex flex-col gap-3">
        {items.map((item, i) => {
          const { entry, duplicateOf, dateIssue } = item;
          const replaced = targets.get(item);
          const diseases = diseaseLabel(entry.diseases);
          return (
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
                    <span className="font-medium break-words">
                      {entry.label}
                    </span>
                  </span>
                  <span id={`${id}-${i}-details`} className="flex flex-col">
                    {diseases !== entry.label && (
                      <span className="text-muted-foreground">{diseases}</span>
                    )}
                    {dateIssue && (
                      <span>
                        {dateIssue === "future"
                          ? T.transfer.preview.dateFuture
                          : T.transfer.preview.dateBeforeBirth}
                      </span>
                    )}
                    {replaced ? (
                      <span>
                        {T.transfer.preview.replaces(
                          replaced.label,
                          formatDate(replaced.date, replaced.datePrecision),
                        )}
                      </span>
                    ) : (
                      duplicateOf && (
                        <span>
                          {(chosen[i]
                            ? T.transfer.preview.addedAgain
                            : T.transfer.preview.duplicate)(
                            duplicateOf.label,
                            formatDate(
                              duplicateOf.date,
                              duplicateOf.datePrecision,
                            ),
                          )}
                        </span>
                      )
                    )}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
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
