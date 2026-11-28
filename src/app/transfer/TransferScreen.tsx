import { useRef, useState, type ChangeEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { todayISO } from "@/core/dates";
import {
  addPart,
  decodeCollected,
  joinWrappedLines,
  MAX_TRANSFER_BYTES,
  missingParts,
  readTransferText,
  TransferError,
  type TransferCollector,
} from "@/core/formats/transfer";
import {
  planImport,
  resolveImport,
  type ImportItem,
} from "@/core/import/merge";
import type { TransferPayload } from "@/core/model";
import { useAppData } from "../data/AppData";
import { BackupHint } from "../entry/BackupHint";
import { T } from "@/texts";
import { ImportPreview } from "./ImportPreview";
import { Scanner } from "./Scanner";

type View =
  | { kind: "collect" }
  | { kind: "preview"; payload: TransferPayload; items: ImportItem[] }
  | { kind: "done"; count: number; replaced: number };

type Way = "scan" | "file" | "text";

const WAYS: { value: Way; label: string }[] = [
  { value: "scan", label: T.transfer.scanCodes },
  { value: "file", label: T.transfer.openFile },
  { value: "text", label: T.transfer.pasteText },
];

/** Zeilen einer Eingabe ab der ersten, die nicht zu den gesammelten Teilen passt. */
interface Rest {
  lines: readonly string[];
  /** Der Inhalt des Textfelds, wenn die Zeilen daraus stammen. */
  pasted?: string;
}

interface Problem {
  message: string;
  /** Passt nicht zu den gesammelten Teilen: „Neu beginnen“ liest ab hier neu. */
  restartWith?: Rest;
  /** Taugt auch allein nicht als Anfang: „Von vorn beginnen“ verwirft die Teile. */
  startOver?: boolean;
}

function messageOf(e: unknown): string {
  return e instanceof TransferError ? e.message : T.transfer.errors.corrupt;
}

/** Kann eine neue Übertragung mit dieser Zeile beginnen? */
function canStartWith(line: string): boolean {
  try {
    addPart(null, line);
    return true;
  } catch {
    return false;
  }
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
 * Die ganze Übertragung, wenn der Text sie allein enthält, wie Datei und Text
 * vom PC. Sonst `null`; Fehler meldet dann das Sammeln Zeile für Zeile.
 */
function wholeTransfer(content: string): TransferPayload | null {
  try {
    const result = readTransferText(content);
    return "payload" in result ? result.payload : null;
  } catch {
    return null;
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
  const [way, setWay] = useState<Way>("scan");
  const fileInput = useRef<HTMLInputElement>(null);

  function setCollector(c: TransferCollector | null) {
    latest.current = c;
    setCollectorState(c);
  }

  function showPreview(payload: TransferPayload) {
    setView({
      kind: "preview",
      payload,
      items: planImport(
        vaccinations,
        payload.entries,
        person?.birthDate ?? null,
        todayISO(),
      ),
    });
  }

  /**
   * Nimmt Teilzeilen auf, aus dem Scanner, einer Datei oder eingefügtem Text.
   * Ist die Übertragung vollständig, erscheint die Vorschau. `false`, wenn
   * eine Zeile scheitert.
   */
  function addLines(lines: readonly string[], pasted?: string): boolean {
    for (const [i, line] of lines.entries()) {
      let next: TransferCollector;
      try {
        next = addPart(latest.current, line).collector;
      } catch (e) {
        // Mit gesammelten Teilen gibt es immer einen Ausweg: „Neu beginnen“ ab
        // dieser Zeile, wenn sie allein taugt, sonst „Von vorn beginnen“.
        const way =
          latest.current === null
            ? {}
            : canStartWith(line)
              ? { restartWith: { lines: lines.slice(i), pasted } }
              : { startOver: true };
        setProblem({ message: messageOf(e), ...way });
        return false;
      }
      if (missingParts(next).length > 0) {
        setCollector(next);
        continue;
      }
      setCollector(null);
      try {
        showPreview(decodeCollected(next));
      } catch (e) {
        setProblem({ message: messageOf(e) });
        return false;
      }
      // Zeilen nach einer vollständigen Übertragung bleiben ungelesen.
      break;
    }
    setProblem(null);
    return true;
  }

  /**
   * Datei und eingefügter Text: eine oder mehrere Teilzeilen. `pasted` ist
   * der Inhalt des Textfelds, wenn der Text daher stammt.
   */
  function readText(content: string, pasted?: string): boolean {
    // Datei und Text vom PC sind ein einziger Teil 1/1. Gescannte Teile
    // derselben Übertragung sind anders geteilt und passen nicht dazu.
    const whole = wholeTransfer(content);
    if (whole) {
      setCollector(null);
      setProblem(null);
      showPreview(whole);
      return true;
    }
    const lines = joinWrappedLines(content.split(/\r\n|\r|\n/)).filter(
      (line) => !isForeignLine(line),
    );
    if (lines.length === 0) {
      // Wie nach einem fremden Code bleiben gesammelte Teile, bis man von vorn beginnt.
      setProblem({
        message: T.transfer.errors.notTransfer,
        startOver: latest.current !== null,
      });
      return false;
    }
    return addLines(lines, pasted);
  }

  /** Eine neue Übertragung mit den Zeilen ab der ersten unpassenden. */
  function restart({ lines, pasted }: Rest) {
    setCollector(null);
    // Gelesener Text verschwindet aus dem Feld wie nach „Einlesen“, sofern
    // es inzwischen nicht geändert wurde.
    if (addLines(lines, pasted) && pasted !== undefined) {
      setText((t) => (t === pasted ? "" : t));
    }
  }

  function startOver() {
    setCollector(null);
    setProblem(null);
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

  async function importEntries(chosen: ImportItem[]) {
    if (view.kind !== "preview" || !person) throw new Error("Keine Vorschau");
    // Die Vorschau kennt den Stand von damals. Ersetzt wird der heutige
    // Eintrag; ist er inzwischen gelöscht, kommt der Eintrag neu dazu.
    const current = chosen.map((item) => ({
      ...item,
      duplicateOf:
        vaccinations.find((v) => v.id === item.duplicateOf?.id) ?? null,
    }));
    const result = resolveImport(current, {
      personId: person.id,
      importId: view.payload.id,
      now: new Date(),
      newId: () => crypto.randomUUID(),
    });
    await actions.importVaccinations(result.vaccinations);
    setView({
      kind: "done",
      count: result.vaccinations.length,
      replaced: result.replaced,
    });
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
        <p role="status">{T.transfer.done(view.count, view.replaced)}</p>
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
          {problem.startOver && (
            <Button type="button" variant="outline" onClick={startOver}>
              {T.transfer.startOver}
            </Button>
          )}
        </div>
      )}
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        aria-label={T.transfer.waysLabel}
        value={way}
        // Ein Klick auf den gewählten Weg wählt ihn nicht ab.
        onValueChange={(v) => v && setWay(v as Way)}
        className="grid w-full grid-cols-3"
      >
        {WAYS.map((w) => (
          <ToggleGroupItem
            key={w.value}
            value={w.value}
            className="h-auto min-h-11 w-full whitespace-normal"
          >
            {w.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {way === "scan" && (
        <Scanner
          onCode={(line) => void addLines([line])}
          onFallback={(w) => setWay(w)}
        />
      )}
      {way === "file" && (
        <>
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
        </>
      )}
      {way === "text" && (
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
              if (readText(text, text)) setText("");
            }}
          >
            {T.transfer.read}
          </Button>
        </div>
      )}
    </div>
  );
}
