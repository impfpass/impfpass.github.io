import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/core/dates";
import { DEFAULT_ANSWERS, type PersonAnswers } from "@/core/model";
import { AnswersFields } from "../answers/AnswersFields";
import { RestoreButton } from "../backup/RestoreButton";
import { useAppData } from "../data/AppData";
import { isStandalone, shouldShowInstallHint } from "../installHintRules";
import { T } from "@/texts";
import { focusFirstError } from "./focusFirstError";
import { PersonFields } from "./PersonFields";
import { validatePerson, type PersonErrors } from "./validatePerson";

export function SetupScreen() {
  const { actions } = useAppData();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [errors, setErrors] = useState<PersonErrors>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [answers, setAnswers] = useState<PersonAnswers>(DEFAULT_ANSWERS);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validatePerson(name, birthDate, todayISO());
    flushSync(() => setErrors(found));
    if (found.name || found.birthDate) {
      focusFirstError("setup", found);
      return;
    }
    setStep(2);
  }

  function answered(e: FormEvent) {
    e.preventDefault();
    setStep(3);
  }

  /**
   * Legt die Person an. Die Route wird vorher gesetzt, damit nach dem Anlegen
   * gleich die gewählte Seite erscheint statt kurz der Übersicht.
   */
  async function start(route: "/uebernehmen" | "/impfungen/neu") {
    setBusy(true);
    setFailed(false);
    navigate(route);
    try {
      await actions.createPerson({ name, birthDate, answers });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-6">
      <p className="text-muted-foreground">{T.app.name}</p>
      {step === 1 ? (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{T.setup.title}</h1>
            <p>{T.setup.intro}</p>
          </div>
          {/* Safari und die App auf dem Home-Bildschirm haben getrennte Speicher */}
          {shouldShowInstallHint(
            navigator.userAgent,
            isStandalone(),
            false,
          ) && (
            <p className="rounded-lg border bg-muted p-4">{T.setup.iosHint}</p>
          )}
          <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
            <PersonFields
              idPrefix="setup"
              name={name}
              birthDate={birthDate}
              errors={errors}
              onName={setName}
              onBirthDate={setBirthDate}
            />
            <Button type="submit" size="lg">
              {T.setup.submit}
            </Button>
          </form>
        </>
      ) : step === 2 ? (
        <form className="flex flex-col gap-5" onSubmit={answered} noValidate>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{T.answers.title}</h1>
            <p>{T.answers.intro}</p>
          </div>
          <AnswersFields
            idPrefix="setup"
            value={answers}
            onChange={setAnswers}
          />
          <Button type="submit" size="lg">
            {T.setup.submit}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setStep(1)}
          >
            {T.answers.back}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <h1 className="text-2xl font-semibold">{T.setup.startTitle}</h1>
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <Button
              type="button"
              size="lg"
              className="h-auto min-h-12 py-2 whitespace-normal"
              disabled={busy}
              aria-describedby="setup-start-import-help"
              onClick={() => void start("/uebernehmen")}
            >
              {T.setup.startImport}
            </Button>
            <p id="setup-start-import-help">{T.setup.startImportHelp}</p>
          </div>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-auto min-h-12 py-2 whitespace-normal"
            disabled={busy}
            onClick={() => void start("/impfungen/neu")}
          >
            {T.setup.startManual}
          </Button>
          {failed && (
            <p role="alert" className="text-destructive">
              {T.common.saveFailed}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy}
            onClick={() => setStep(2)}
          >
            {T.answers.back}
          </Button>
        </div>
      )}
      <section className="flex flex-col gap-2 border-t pt-6">
        <p>{T.setup.restoreHint}</p>
        <RestoreButton />
      </section>
    </main>
  );
}
