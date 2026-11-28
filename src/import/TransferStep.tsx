import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";
import { todayISO } from "@/core/dates";
import {
  encodeTransfer,
  MAX_TRANSFER_ENTRIES,
  newTransferId,
  toTextLine,
  transferFileName,
} from "@/core/formats/transfer";
import { draftToEntries, type Draft } from "@/core/import/draft";
import type { TransferEntry } from "@/core/model";
import { saveFile } from "@/lib/saveFile";
import { T } from "@/texts";
import { copyText } from "@/lib/copyText";
import { DeleteDraftButton } from "./DeleteDraftButton";

const t = T.pc.send;

interface TransferStepProps {
  draft: Draft;
  onBack(): void;
  onCleared(): void;
}

type Prepared =
  | { problem: string }
  | {
      /** `null`: zu viele Teile für QR-Codes, Datei und Text gehen trotzdem. */
      parts: string[] | null;
      textLine: string;
    };

function prepare(draft: Draft): Prepared {
  let entries: TransferEntry[];
  try {
    entries = draftToEntries(draft, todayISO());
  } catch {
    return {
      problem:
        draft.rows.length > MAX_TRANSFER_ENTRIES
          ? t.tooManyRows
          : T.pc.table.blocked,
    };
  }
  const payload = {
    id: newTransferId(),
    createdAt: new Date().toISOString(),
    entries,
  };
  let parts: string[] | null;
  try {
    parts = encodeTransfer(payload);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    parts = null;
  }
  // Datei und Text sind ein einziger Teil ohne Längengrenze.
  return { parts, textLine: toTextLine(encodeTransfer(payload, Infinity)[0]) };
}

/** Schritt 3: Die geprüfte Tabelle als QR-Codes, Datei oder Text. */
export function TransferStep({ draft, onBack, onCleared }: TransferStepProps) {
  // Einmal beim Öffnen; eine neue ID gibt es erst, wenn der Schritt neu öffnet.
  const [transfer] = useState(() => prepare(draft));
  const parts = "parts" in transfer ? transfer.parts : null;
  const textLine = "textLine" in transfer ? transfer.textLine : "";
  const total = parts?.length ?? 0;

  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (total === 0) return;
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("textarea, input, [role=dialog], [role=alertdialog]")
      ) {
        return;
      }
      // Ein offener Dialog gehört der Tastatur, auch wenn der Fokus woanders liegt.
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [total]);

  async function save() {
    const file = new File([`${textLine}\n`], transferFileName(new Date()), {
      type: "text/plain",
    });
    setSaveFailed(false);
    try {
      await saveFile(file, { preferShare: false });
    } catch {
      setSaveFailed(true);
    }
  }

  async function copy() {
    setCopied(await copyText(textLine, textRef.current));
  }

  if ("problem" in transfer) {
    return (
      <div className="mt-4 space-y-4">
        <p role="alert" className="text-destructive">
          {transfer.problem}
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          {T.pc.table.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-8">
      <section aria-labelledby="send-codes" className="space-y-3">
        <h3 id="send-codes" className="text-lg font-semibold">
          {t.codesHeading}
        </h3>
        {parts === null ? (
          <p>{t.tooManyCodes}</p>
        ) : (
          <>
            <p aria-live="polite" className="font-semibold">
              {t.codeOf(index + 1, total)}
            </p>
            <QrCode
              text={parts[index]}
              label={T.pc.send.codeLabel(index + 1, total)}
              className="aspect-square h-auto w-[min(80vh,640px)] max-w-full"
            />
          </>
        )}
        {total > 1 && (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              {t.previous}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={index === total - 1}
              onClick={() => setIndex(index + 1)}
            >
              {t.next}
            </Button>
          </div>
        )}
        <p>{t.codesHelp}</p>
        <p>{t.codesPrivacy}</p>
      </section>

      <section aria-labelledby="send-file" className="space-y-3">
        <h3 id="send-file" className="text-lg font-semibold">
          {t.fileHeading}
        </h3>
        <Button type="button" variant="outline" onClick={save}>
          {t.saveFile}
        </Button>
        {saveFailed && (
          <p role="alert" className="text-destructive">
            {t.saveFailed}
          </p>
        )}
        <p>{t.fileHelp}</p>
      </section>

      <section aria-labelledby="send-text" className="space-y-3">
        <h3 id="send-text" className="text-lg font-semibold">
          {t.textHeading}
        </h3>
        <Button type="button" variant="outline" onClick={copy}>
          {t.copyText}
        </Button>
        {/* Der Bereich steht immer im DOM, damit die Meldung angesagt wird. */}
        <p role="status" className={copied === null ? "sr-only" : undefined}>
          {copied === null
            ? ""
            : copied
              ? T.pc.guide.copied
              : T.pc.guide.copyFailed}
        </p>
        <textarea
          ref={textRef}
          readOnly
          rows={3}
          aria-label={t.textLabel}
          value={textLine}
          className="w-full rounded-md border p-2 font-mono break-all"
        />
        <p>{t.textHelp}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          {T.pc.table.back}
        </Button>
        <DeleteDraftButton onConfirm={onCleared} />
      </div>
    </div>
  );
}
