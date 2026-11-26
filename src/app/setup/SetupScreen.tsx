import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidISODate, todayISO } from "@/core/dates";
import { useAppData } from "../data/AppData";
import { T } from "../texts";

interface Errors {
  name?: string;
  birthDate?: string;
}

function validateSetup(name: string, birthDate: string, today: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = T.setup.errors.nameMissing;
  if (!birthDate) errors.birthDate = T.setup.errors.birthDateMissing;
  else if (!isValidISODate(birthDate))
    errors.birthDate = T.setup.errors.birthDateInvalid;
  else if (birthDate > today) errors.birthDate = T.setup.errors.birthDateFuture;
  return errors;
}

export function SetupScreen() {
  const { actions } = useAppData();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateSetup(name, birthDate, todayISO());
    setErrors(found);
    if (found.name || found.birthDate) return;
    setBusy(true);
    try {
      await actions.createPerson({ name, birthDate });
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="setup-name">{T.setup.name}</Label>
          <Input
            id="setup-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "setup-name-error" : undefined}
          />
          {errors.name && (
            <p id="setup-name-error" className="text-destructive">
              {errors.name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="setup-birth">{T.setup.birthDate}</Label>
          <Input
            id="setup-birth"
            type="date"
            autoComplete="bday"
            max={todayISO()}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-invalid={errors.birthDate ? true : undefined}
            aria-describedby={
              errors.birthDate ? "setup-birth-error" : undefined
            }
          />
          {errors.birthDate && (
            <p id="setup-birth-error" className="text-destructive">
              {errors.birthDate}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={busy}>
          {T.setup.submit}
        </Button>
      </form>
    </main>
  );
}
