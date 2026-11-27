import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDate, todayISO } from "@/core/dates";
import type { Person } from "@/core/model";
import { RestoreButton } from "../backup/RestoreButton";
import { useSaveBackup } from "../backup/useSaveBackup";
import { useAppData } from "../data/AppData";
import { focusFirstError } from "../setup/focusFirstError";
import { PersonFields } from "../setup/PersonFields";
import { validatePerson, type PersonErrors } from "../setup/validatePerson";
import { T } from "../texts";

function ProfileForm({ person }: { person: Person }) {
  const { actions } = useAppData();
  const [name, setName] = useState(person.name);
  const [birthDate, setBirthDate] = useState(person.birthDate);
  const [errors, setErrors] = useState<PersonErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const found = validatePerson(name, birthDate, todayISO());
    flushSync(() => setErrors(found));
    if (found.name || found.birthDate) {
      focusFirstError("profile", found);
      return;
    }
    try {
      await actions.updatePerson({ ...person, name: name.trim(), birthDate });
      setMessage(T.settings.saved);
    } catch {
      setMessage(T.common.saveFailed);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <PersonFields
        idPrefix="profile"
        name={name}
        birthDate={birthDate}
        errors={errors}
        onName={setName}
        onBirthDate={setBirthDate}
      />
      <Button type="submit" variant="outline">
        {T.settings.saveProfile}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

function BackupSection() {
  const { settings } = useAppData();
  const { save, busy, failed } = useSaveBackup();
  const last = settings.lastBackupAt
    ? formatDate(todayISO(new Date(settings.lastBackupAt)), "day")
    : null;

  return (
    <div className="flex flex-col gap-3">
      <p>{last ? T.settings.lastBackup(last) : T.settings.noBackup}</p>
      <p className="text-muted-foreground">{T.info.backup}</p>
      <Button type="button" onClick={() => void save()} disabled={busy}>
        {T.backup.save}
      </Button>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.backup.saveFailed}
        </p>
      )}
      <RestoreButton />
    </div>
  );
}

export function SettingsScreen() {
  const { person } = useAppData();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{T.settings.title}</h1>
      <section
        aria-labelledby="settings-profile"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-profile" className="text-lg font-semibold">
          {T.settings.profile}
        </h2>
        {/* Neu aufbauen, wenn nach einer Wiederherstellung eine andere Person da ist */}
        {person && <ProfileForm key={person.id} person={person} />}
      </section>
      <section
        aria-labelledby="settings-backup"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-backup" className="text-lg font-semibold">
          {T.settings.backup}
        </h2>
        <BackupSection />
      </section>
      <Link
        href="/einstellungen/info"
        className="flex min-h-12 items-center justify-between rounded-md border px-4"
      >
        {T.info.title}
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
}
