import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/core/dates";
import { RestoreButton } from "../backup/RestoreButton";
import { useAppData } from "../data/AppData";
import { isStandalone, shouldShowInstallHint } from "../installHintRules";
import { T } from "@/texts";
import { focusFirstError } from "./focusFirstError";
import { PersonFields } from "./PersonFields";
import { validatePerson, type PersonErrors } from "./validatePerson";

export function SetupScreen() {
  const { actions } = useAppData();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [errors, setErrors] = useState<PersonErrors>({});
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
    setBusy(true);
    setFailed(false);
    try {
      await actions.createPerson({ name, birthDate });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-6">
      <p className="text-muted-foreground">{T.app.name}</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{T.setup.title}</h1>
        <p>{T.setup.intro}</p>
      </div>
      {/* Safari und die App auf dem Home-Bildschirm haben getrennte Speicher */}
      {shouldShowInstallHint(navigator.userAgent, isStandalone(), false) && (
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
        {failed && (
          <p role="alert" className="text-destructive">
            {T.common.saveFailed}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {T.setup.submit}
        </Button>
      </form>
      <section className="flex flex-col gap-2 border-t pt-6">
        <p>{T.setup.restoreHint}</p>
        <RestoreButton />
      </section>
    </main>
  );
}
