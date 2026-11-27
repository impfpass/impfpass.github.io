import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDate, todayISO } from "@/core/dates";
import type { Person, PersonAnswers } from "@/core/model";
import { AnswersFields } from "../answers/AnswersFields";
import { BloodFields } from "./BloodFields";
import { Label } from "@/components/ui/label";
import { RestoreButton } from "../backup/RestoreButton";
import { useSaveBackup } from "../backup/useSaveBackup";
import { useAppData } from "../data/AppData";
import { focusFirstError } from "../setup/focusFirstError";
import { PersonFields } from "../setup/PersonFields";
import { validatePerson, type PersonErrors } from "../setup/validatePerson";
import { T } from "@/texts";

function ProfileForm({ person }: { person: Person }) {
  const { actions } = useAppData();
  const [name, setName] = useState(person.name);
  const [birthDate, setBirthDate] = useState(person.birthDate);
  const [bloodGroup, setBloodGroup] = useState(person.bloodGroup);
  const [rhesus, setRhesus] = useState(person.rhesus);
  const [formula, setFormula] = useState(person.rhesusFormula ?? "");
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
      await actions.updatePerson({
        ...person,
        name: name.trim(),
        birthDate,
        bloodGroup,
        rhesus,
        rhesusFormula: formula.trim() || undefined,
      });
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
      <BloodFields
        idPrefix="profile"
        group={bloodGroup}
        rhesus={rhesus}
        formula={formula}
        onGroup={setBloodGroup}
        onRhesus={setRhesus}
        onFormula={setFormula}
      />
      <Button type="submit" variant="outline">
        {T.settings.saveProfile}
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

function AnswersForm({ person }: { person: Person }) {
  const { decisions, actions } = useAppData();
  const [answers, setAnswers] = useState<PersonAnswers>(person.answers);
  const [failed, setFailed] = useState(false);

  // Jede Änderung wird sofort gespeichert, wie Vorlauf und Saison-Tag.
  async function change(next: PersonAnswers) {
    const previous = answers;
    setAnswers(next);
    setFailed(false);
    try {
      await actions.updatePerson({ ...person, answers: next });
      // „Nein“ zur FSME-Nachfrage auf der Übersicht gilt nach „Ja“ nicht mehr.
      const tbeDeclined = decisions.some(
        (d) => d.recommendationId === "tbe" && d.kind === "declined",
      );
      if (next.fsme === "yes" && previous.fsme !== "yes" && tbeDeclined) {
        await actions.deleteDecision("tbe");
      }
    } catch {
      setAnswers(previous);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p>{T.settings.answersIntro}</p>
      <AnswersFields
        idPrefix="answers"
        value={answers}
        onChange={(next) => void change(next)}
      />
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
    </div>
  );
}

const LEAD_MONTHS = [1, 2, 3, 4, 6, 9, 12];
const SEASON_DAYS = ["08-01", "08-15", "09-01", "09-15", "10-01"] as const;
const SELECT_CLASS =
  "h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

function RemindersSection() {
  const { settings, actions } = useAppData();
  const [failed, setFailed] = useState(false);

  async function change(next: typeof settings) {
    setFailed(false);
    try {
      await actions.saveSettings(next);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-lead">{T.settings.leadTime}</Label>
        <select
          id="settings-lead"
          className={SELECT_CLASS}
          value={settings.leadMonths}
          aria-describedby="settings-lead-help"
          onChange={(e) =>
            void change({ ...settings, leadMonths: Number(e.target.value) })
          }
        >
          {LEAD_MONTHS.map((n) => (
            <option key={n} value={n}>
              {T.settings.leadTimeOption(n)}
            </option>
          ))}
        </select>
        <p id="settings-lead-help" className="text-muted-foreground">
          {T.settings.leadTimeHelp}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-season">{T.settings.seasonDay}</Label>
        <select
          id="settings-season"
          className={SELECT_CLASS}
          value={settings.seasonDay}
          aria-describedby="settings-season-help"
          onChange={(e) =>
            void change({ ...settings, seasonDay: e.target.value })
          }
        >
          {SEASON_DAYS.map((d) => (
            <option key={d} value={d}>
              {T.settings.seasonDayOptions[d]}
            </option>
          ))}
        </select>
        <p id="settings-season-help" className="text-muted-foreground">
          {T.settings.seasonDayHelp}
        </p>
      </div>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
    </div>
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

const LINK_CLASS =
  "flex min-h-12 items-center justify-between rounded-md border px-4";

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
        aria-labelledby="settings-answers"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-answers" className="text-lg font-semibold">
          {T.answers.title}
        </h2>
        {person && <AnswersForm key={person.id} person={person} />}
      </section>
      <section
        aria-labelledby="settings-reminders"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-reminders" className="text-lg font-semibold">
          {T.settings.reminders}
        </h2>
        <RemindersSection />
      </section>
      <section
        aria-labelledby="settings-transfer"
        className="flex flex-col gap-4"
      >
        <h2 id="settings-transfer" className="text-lg font-semibold">
          {T.settings.transfer}
        </h2>
        <p>{T.settings.transferText}</p>
        <Link href="/uebernehmen" className={LINK_CLASS}>
          {T.settings.transfer}
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
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
      <Link href="/einstellungen/info" className={LINK_CLASS}>
        {T.info.title}
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
}
