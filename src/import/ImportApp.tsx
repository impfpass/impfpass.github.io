import { useState } from "react";
import type { DraftStore } from "@/core/storage/draftStore";
import { openDraftStore } from "@/core/storage/draftStore";
import { cn } from "@/lib/utils";
import { T } from "@/texts";
import { DraftTable } from "./DraftTable";
import { GuideStep } from "./GuideStep";
import { TransferStep } from "./TransferStep";
import { useDraft } from "./useDraft";

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string; heading: string }[] = [
  { step: 1, label: `1 ${T.pc.steps.guide}`, heading: T.pc.steps.guide },
  { step: 2, label: `2 ${T.pc.steps.table}`, heading: T.pc.steps.table },
  { step: 3, label: `3 ${T.pc.steps.transfer}`, heading: T.pc.steps.transfer },
];

/** Wurzel der PC-App unter /import/. */
export function ImportApp({
  openStore = openDraftStore,
}: {
  openStore?: () => Promise<DraftStore>;
}) {
  const { status, draft, persistent, update, clear } = useDraft(openStore);
  // null: noch nicht festgelegt, solange der Entwurf lädt.
  const [chosen, setChosen] = useState<Step | null>(null);
  // Der Startschritt folgt einmal dem geladenen Entwurf und bleibt dann, auch
  // wenn in Schritt 2 die letzte Zeile gelöscht wird.
  if (status === "ready" && chosen === null) {
    setChosen(draft.rows.length > 0 ? 2 : 1);
  }
  const step: Step = chosen ?? 1;
  // Meldung aus Schritt 1, gilt nur, bis der Schritt wechselt.
  const [message, setMessage] = useState<string | null>(null);

  function goTo(n: Step) {
    setChosen(n);
    setMessage(null);
  }

  // „Entwurf löschen“ in Schritt 1, 2 und 3.
  function deleteDraft() {
    void clear();
    setChosen(1);
    setMessage(T.pc.send.deleted);
  }

  return (
    <div
      className={cn(
        "mx-auto flex min-h-screen flex-col gap-6 p-6",
        // Die Tabelle braucht Platz, die anderen Schritte bleiben schmal.
        step === 2 ? "max-w-[112rem]" : "max-w-7xl",
      )}
    >
      <header>
        <h1 className="text-2xl font-semibold">{T.pc.title}</h1>
      </header>
      {/* Die Bereiche für Meldungen stehen immer im DOM, nur ihr Text kommt und geht. */}
      <p
        role="status"
        className={persistent ? "sr-only" : "rounded-md border p-3"}
      >
        {persistent ? "" : T.pc.notSaved}
      </p>
      <main className="flex-1">
        {status === "loading" ? (
          <p>{T.app.loading}</p>
        ) : (
          <>
            <nav aria-label={T.pc.steps.label}>
              <ol className="flex flex-wrap gap-2">
                {STEPS.map(({ step: n, label }) => (
                  <li
                    key={n}
                    aria-current={n === step ? "step" : undefined}
                    className={
                      n === step ? "rounded-md border-2 font-semibold" : ""
                    }
                  >
                    {n === 3 ? (
                      <span className="inline-flex min-h-11 items-center px-3">
                        {label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="min-h-11 min-w-11 px-3"
                        onClick={() => goTo(n)}
                      >
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <section className="mt-6">
              <h2 className="text-xl font-semibold">
                {STEPS[step - 1].heading}
              </h2>
              <p
                role="status"
                className={message ? "mt-4 rounded-md border p-3" : "sr-only"}
              >
                {message}
              </p>
              {step === 1 && (
                <GuideStep
                  draft={draft}
                  update={update}
                  onDone={(msg) => {
                    setChosen(2);
                    setMessage(msg ?? null);
                  }}
                  onClear={deleteDraft}
                />
              )}
              {step === 2 && (
                <DraftTable
                  draft={draft}
                  update={update}
                  onNext={() => goTo(3)}
                  onClear={deleteDraft}
                />
              )}
              {step === 3 && (
                <TransferStep
                  draft={draft}
                  onBack={() => goTo(2)}
                  onCleared={deleteDraft}
                />
              )}
            </section>
          </>
        )}
      </main>
      <footer className="space-y-1">
        <p>{T.pc.footer.medical}</p>
        <p>{T.pc.footer.local}</p>
      </footer>
    </div>
  );
}
