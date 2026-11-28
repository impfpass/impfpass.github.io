import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PersonAnswers } from "@/core/model";
import { T } from "@/texts";
import { CHOICE_ITEM_CLASS } from "../styles";

type Job = PersonAnswers["job"];

const FSME_OPTIONS: { value: PersonAnswers["fsme"]; label: string }[] = [
  { value: "yes", label: T.answers.fsmeYes },
  { value: "no", label: T.answers.fsmeNo },
  { value: "open", label: T.answers.fsmeOpen },
];

const JOBS: { key: keyof Job; label: string }[] = [
  { key: "patients", label: T.answers.jobPatients },
  { key: "communityFacility", label: T.answers.jobCommunity },
  { key: "bloodContact", label: T.answers.jobBlood },
  { key: "animalContact", label: T.answers.jobAnimals },
];

/** Angaben zur Person für die STIKO-Regeln (Ersteinrichtung und Einstellungen). */
export function AnswersFields(props: {
  idPrefix: string;
  value: PersonAnswers;
  onChange(a: PersonAnswers): void;
}) {
  const { idPrefix, value, onChange } = props;
  const chronicId = `${idPrefix}-chronic`;
  const fsmeId = `${idPrefix}-fsme`;
  const anyJob = JOBS.some((j) => value.job[j.key]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id={chronicId}
            checked={value.chronicIllness}
            onCheckedChange={(chronicIllness) =>
              onChange({ ...value, chronicIllness })
            }
            aria-describedby={`${chronicId}-help`}
          />
          <Label htmlFor={chronicId} className="min-h-11 flex-1">
            {T.answers.chronic}
          </Label>
        </div>
        <p id={`${chronicId}-help`} className="text-muted-foreground">
          {T.answers.chronicHelp}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p id={`${fsmeId}-label`} className="font-medium">
          {T.answers.fsmeQuestion}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          value={value.fsme}
          aria-labelledby={`${fsmeId}-label`}
          aria-describedby={`${fsmeId}-help`}
          onValueChange={(v) =>
            v && onChange({ ...value, fsme: v as PersonAnswers["fsme"] })
          }
          className="grid w-full grid-cols-3"
        >
          {FSME_OPTIONS.map((o) => (
            <ToggleGroupItem
              key={o.value}
              value={o.value}
              className={CHOICE_ITEM_CLASS}
            >
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p id={`${fsmeId}-help`} className="text-muted-foreground">
          {T.answers.fsmeHelp}
        </p>
        <a
          href={T.answers.fsmeLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline"
        >
          {T.answers.fsmeLink}
        </a>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 font-medium">{T.answers.jobTitle}</legend>
        {JOBS.map((j) => {
          const id = `${idPrefix}-job-${j.key}`;
          return (
            <div key={j.key} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={id}
                checked={value.job[j.key]}
                onCheckedChange={(c) =>
                  onChange({
                    ...value,
                    job: { ...value.job, [j.key]: c === true },
                  })
                }
              />
              <Label
                htmlFor={id}
                className="min-h-11 flex-1 items-center font-normal"
              >
                {j.label}
              </Label>
            </div>
          );
        })}
        {anyJob && <p className="text-muted-foreground">{T.answers.jobHint}</p>}
      </fieldset>
    </div>
  );
}
