import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";
import { todayISO } from "@/core/dates";
import {
  encodeTransfer,
  newTransferId,
  toTextLine,
  transferFileName,
} from "@/core/formats/transfer";
import { draftToEntries, type Draft } from "@/core/import/draft";
import { saveFile } from "@/lib/saveFile";
import { T } from "@/texts";
import { copyText } from "./copyText";
import { DeleteDraftButton } from "./DeleteDraftButton";

const t = T.pc.send;

interface TransferStepProps {
  draft: Draft;
  onBack(): void;
  onCleared(): void;
}

/** Schritt 3: Die geprüfte Tabelle als QR-Codes, Datei oder Text. */
export function TransferStep({ draft, onBack, onCleared }: TransferStepProps) {
  // Einmal beim Öffnen; eine neue ID gibt es erst, wenn der Schritt neu öffnet.
  const [transfer] = useState(() => {
    const payload = {
      id: newTransferId(),
      createdAt: new Date().toISOString(),
      entries: draftToEntries(draft, todayISO()),
    };
    return {
      parts: encodeTransfer(payload),
      textLine: toTextLine(encodeTransfer(payload, Infinity)[0]),
    };
  });
  const { parts, textLine } = transfer;
  const total = parts.length;

  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState<boolean | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("textarea, input")
      ) {
        return;
      }
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
    await saveFile(file, { preferShare: false });
  }

  async function copy() {
    setCopied(await copyText(textLine, textRef.current));
  }

  return (
    <div className="mt-4 space-y-8">
      <section aria-labelledby="send-codes" className="space-y-3">
        <h3 id="send-codes" className="text-lg font-semibold">
          {t.codesHeading}
        </h3>
        <p aria-live="polite" className="font-semibold">
          {t.codeOf(index + 1, total)}
        </p>
        <QrCode
          text={parts[index]}
          label={T.pc.send.codeLabel(index + 1, total)}
          className="aspect-square h-auto w-[min(80vh,640px)] max-w-full"
        />
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
        <p>{t.fileHelp}</p>
      </section>

      <section aria-labelledby="send-text" className="space-y-3">
        <h3 id="send-text" className="text-lg font-semibold">
          {t.textHeading}
        </h3>
        <Button type="button" variant="outline" onClick={copy}>
          {t.copyText}
        </Button>
        {copied !== null && (
          <p role="status">
            {copied ? T.pc.guide.copied : T.pc.guide.copyFailed}
          </p>
        )}
        <textarea
          ref={textRef}
          readOnly
          rows={3}
          aria-label={t.textLabel}
          value={textLine}
          className="w-full rounded-md border p-2 font-mono text-sm"
        />
        <p>{t.textHelp}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <DeleteDraftButton onConfirm={onCleared} />
      </div>
    </div>
  );
}
