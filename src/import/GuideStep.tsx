import { useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChatbotAnswerError, parseChatbotAnswer } from "@/core/import/chatbot";
import {
  emptyDraft,
  newRow,
  rowFromParsed,
  type Draft,
  type DraftRow,
} from "@/core/import/draft";
import { T } from "@/texts";
import { copyText } from "./copyText";
import { DeleteDraftButton } from "./DeleteDraftButton";

const TEXTAREA_CLASS =
  "w-full rounded-md border border-input bg-transparent p-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Schritt 1: Anleitung für den Chatbot, Antwort einfügen (Spec 8.1). */
export function GuideStep({
  draft,
  update,
  onDone,
  onClear,
}: {
  draft: Draft;
  update(fn: (d: Draft) => Draft): void;
  onDone(message?: string): void;
  /** „Entwurf löschen“ ist bestätigt. */
  onClear(): void;
}) {
  const ids = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Gelesene Zeilen, solange die Frage „Anhängen oder vorher löschen?“ offen ist.
  const [pending, setPending] = useState<DraftRow[] | null>(null);
  const g = T.pc.guide;

  async function copy() {
    setCopied(await copyText(T.pc.prompt, promptRef.current));
  }

  function read() {
    let rows: DraftRow[];
    try {
      const parsed = parseChatbotAnswer(answer);
      rows = parsed.map((p) => rowFromParsed(p, crypto.randomUUID()));
    } catch (e) {
      if (!(e instanceof ChatbotAnswerError)) throw e;
      setError(e.message);
      return;
    }
    setError(null);
    // Nicht still anhängen: Der Entwurf kann von einer anderen Person sein.
    if (draft.rows.length > 0) setPending(rows);
    else take(rows, "append");
  }

  function take(rows: DraftRow[], mode: "append" | "replace") {
    update((d) =>
      mode === "replace"
        ? { ...emptyDraft(new Date()), rows }
        : { ...d, rows: [...d.rows, ...rows] },
    );
    onDone(g.imported(rows.length));
  }

  function skip() {
    if (draft.rows.length === 0) {
      update((d) => ({ ...d, rows: [newRow(crypto.randomUUID())] }));
    }
    onDone();
  }

  return (
    <div className="space-y-6">
      {draft.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
          <p>{g.draftHas(draft.rows.length)}</p>
          <DeleteDraftButton onConfirm={onClear} />
        </div>
      )}
      <h3 className="text-lg font-semibold">{g.heading}</h3>
      <ol className="list-none space-y-2">
        {g.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p role="note" className="rounded-md border p-3">
        {g.privacy}
      </p>

      <div className="space-y-2">
        <Label htmlFor={`${ids}-prompt`}>{g.promptLabel}</Label>
        <textarea
          id={`${ids}-prompt`}
          ref={promptRef}
          readOnly
          rows={8}
          value={T.pc.prompt}
          className={TEXTAREA_CLASS}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={copy}>
            {g.copy}
          </Button>
          {/* Der Bereich steht immer im DOM, damit die Meldung angesagt wird. */}
          <p role="status" className={copied === null ? "sr-only" : undefined}>
            {copied === null ? "" : copied ? g.copied : g.copyFailed}
          </p>
        </div>
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor={`${ids}-birth`}>{g.birthDate}</Label>
        <Input
          id={`${ids}-birth`}
          inputMode="numeric"
          autoComplete="off"
          placeholder={g.birthDatePlaceholder}
          aria-describedby={`${ids}-birth-help`}
          value={draft.birthDate}
          onChange={(e) => {
            const birthDate = e.target.value;
            update((d) => ({ ...d, birthDate }));
          }}
        />
        <p id={`${ids}-birth-help`} className="text-muted-foreground">
          {g.birthDateHelp}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${ids}-answer`}>{g.answerLabel}</Label>
        <textarea
          id={`${ids}-answer`}
          rows={8}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ids}-answer-error` : undefined}
          className={TEXTAREA_CLASS}
        />
        {error && (
          <p
            id={`${ids}-answer-error`}
            role="alert"
            className="text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={read}>
            {g.read}
          </Button>
          <Button type="button" variant="outline" onClick={skip}>
            {g.skip}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {g.appendQuestion(draft.rows.length)}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{g.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={() => pending && take(pending, "replace")}
            >
              {g.replace}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => pending && take(pending, "append")}
            >
              {g.append}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
