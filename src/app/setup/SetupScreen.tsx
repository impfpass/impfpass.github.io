import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/core/dates";
import { useAppData } from "../data/AppData";
import { T } from "../texts";
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
    setErrors(found);
    if (found.name || found.birthDate) return;
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
    </main>
  );
}
