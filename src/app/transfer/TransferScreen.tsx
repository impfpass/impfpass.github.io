import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  addPart,
  decodeCollected,
  MAX_TRANSFER_BYTES,
  missingParts,
  TransferError,
  type TransferCollector,
} from "@/core/formats/transfer";
import {
  planImport,
  toVaccinations,
  type ImportItem,
} from "@/core/import/merge";
import type { TransferEntry, TransferPayload } from "@/core/model";
import { useAppData } from "../data/AppData";
import { BackupHint } from "../entry/BackupHint";
import { T } from "@/texts";
import { ImportPreview } from "./ImportPreview";

type View =
  | { kind: "collect" }
  | { kind: "preview"; payload: TransferPayload; items: ImportItem[] }
  | { kind: "done"; count: number };

interface Problem {
  message: string;
  /** Teil einer anderen Übertragung: „Neu beginnen“ fängt mit ihm an. */
  restartWith?: string;
}

function messageOf(e: unknown): string {
  return e instanceof TransferError ? e.message : T.transfer.errors.corrupt;
}

/** Zeilen ohne Teil einer Übertragung, etwa Gruß und Unterschrift einer E-Mail. */
function isForeignLine(line: string): boolean {
  try {
    addPart(null, line);
    return false;
  } catch (e) {
    return e instanceof TransferError && e.code === "notTransfer";
  }
}

/**
 * „Impfungen übernehmen“: sammelt die Teile einer Übertragung vom PC in
 * beliebiger Reihenfolge, zeigt die Vorschau und übernimmt die gewählten
 * Einträge.
 */
export function TransferScreen() {
  const { person, actions, vaccinations } = useAppData();
  const [view, setView] = useState<View>({ kind: "collect" });
  const [collector, setCollectorState] = useState<TransferCollector | null>(
    null,
  );
  // Eingefügter Text und der Scanner liefern mehrere Teile, bevor React neu
  // rendert. Der Ref hält immer den neuesten Stand.
  const latest = useRef<TransferCollector | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function setCollector(c: TransferCollector | null) {
    latest.current = c;
    setCollectorState(c);
  }

  /**
   * Nimmt eine Teilzeile auf, aus dem Scanner, einer Datei oder eingefügtem
   * Text. Ist die Übertragung vollständig, erscheint die Vorschau.
   */
  function onCode(line: string): "partial" | "complete" | "failed" {
    let next: TransferCollector;
    try {
      next = addPart(latest.current, line).collector;
    } catch (e) {
      const other = e instanceof TransferError && e.code === "otherTransfer";
      setProblem({
        message: messageOf(e),
        ...(other && { restartWith: line }),
      });
      return "failed";
    }
    setProblem(null);
    if (missingParts(next).length > 0) {
      setCollector(next);
      return "partial";
    }
    setCollector(null);
    try {
      const payload = decodeCollected(next);
      setView({
        kind: "preview",
        payload,
        items: planImport(vaccinations, payload.entries),
      });
      return "complete";
    } catch (e) {
      setProblem({ message: messageOf(e) });
      return "failed";
    }
  }

  /** Datei und eingefügter Text: eine oder mehrere Teilzeilen. */
  function readText(content: string): boolean {
    const lines = content
      .split(/\r\n|\r|\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !isForeignLine(line));
    if (lines.length === 0) {
      setProblem({ message: T.transfer.errors.notTransfer });
      return false;
    }
    for (const line of lines) {
      const result = onCode(line);
      if (result !== "partial") return result === "complete";
    }
    return true;
  }

  function restart(line: string) {
    setCollector(null);
    onCode(line);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Zurücksetzen, damit dieselbe Datei noch einmal gewählt werden kann.
    e.target.value = "";
    if (!file) return;
    // Eine echte Übertragung ist viel kleiner; schützt vor versehentlich
    // gewählten großen Dateien.
    if (file.size > MAX_TRANSFER_BYTES) {
      setProblem({ message: T.transfer.fileTooLarge });
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      setProblem({ message: T.transfer.errors.notTransfer });
      return;
    }
    readText(content);
  }

  async function importEntries(entries: TransferEntry[]) {
    if (view.kind !== "preview" || !person) throw new Error("Keine Vorschau");
    const vs = toVaccinations(entries, {
      personId: person.id,
      importId: view.payload.id,
      now: new Date(),
      newId: () => crypto.randomUUID(),
    });
    await actions.importVaccinations(vs);
    setView({ kind: "done", count: vs.length });
  }

  function cancel() {
    setCollector(null);
    setProblem(null);
    setView({ kind: "collect" });
  }

  const heading = (
    <h1 className="text-2xl font-semibold">{T.transfer.title}</h1>
  );

  if (view.kind === "preview") {
    return (
      <div className="flex flex-col gap-5">
        {heading}
        <ImportPreview
          items={view.items}
          onImport={importEntries}
          onCancel={cancel}
        />
      </div>
    );
  }

  if (view.kind === "done") {
    return (
      <div className="flex flex-col gap-5">
        {heading}
        <p role="status">{T.transfer.done(view.count)}</p>
        <BackupHint />
        <Button asChild variant="outline">
          <Link href="/impfungen">{T.transfer.toList}</Link>
        </Button>
      </div>
    );
  }

  const missing = collector ? missingParts(collector) : [];
  const restartWith = problem?.restartWith;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {heading}
        <p>{T.transfer.intro}</p>
      </div>
      {collector && (
        <p role="status" className="font-semibold">
          {T.transfer.progress(
            collector.total - missing.length,
            collector.total,
            missing,
          )}
        </p>
      )}
      {problem && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-destructive">
            {problem.message}
          </p>
          {restartWith !== undefined && (
            <Button
              type="button"
              variant="outline"
              onClick={() => restart(restartWith)}
            >
              {T.transfer.restart}
            </Button>
          )}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInput.current?.click()}
      >
        {T.transfer.openFile}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => void onFile(e)}
        data-testid="transfer-file"
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="transfer-text">{T.transfer.pasteText}</Label>
        <textarea
          id="transfer-text"
          rows={4}
          className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-base"
          // Base45 ist kein Text: nichts korrigieren oder großschreiben
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          type="button"
          disabled={text.trim() === ""}
          onClick={() => {
            if (readText(text)) setText("");
          }}
        >
          {T.transfer.read}
        </Button>
      </div>
    </div>
  );
}
