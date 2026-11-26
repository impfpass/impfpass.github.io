import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayISO } from "@/core/dates";
import { T } from "../texts";
import type { PersonErrors } from "./validatePerson";

/** Eingabefelder Name und Geburtsdatum (Ersteinrichtung und Profil). */
export function PersonFields(props: {
  idPrefix: string;
  name: string;
  birthDate: string;
  errors: PersonErrors;
  onName(value: string): void;
  onBirthDate(value: string): void;
}) {
  const { idPrefix, errors } = props;
  const nameId = `${idPrefix}-name`;
  const birthId = `${idPrefix}-birth`;
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>{T.setup.name}</Label>
        <Input
          id={nameId}
          autoComplete="name"
          value={props.name}
          onChange={(e) => props.onName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
        />
        {errors.name && (
          <p id={`${nameId}-error`} className="text-destructive">
            {errors.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={birthId}>{T.setup.birthDate}</Label>
        <Input
          id={birthId}
          type="date"
          autoComplete="bday"
          max={todayISO()}
          value={props.birthDate}
          onChange={(e) => props.onBirthDate(e.target.value)}
          aria-invalid={errors.birthDate ? true : undefined}
          aria-describedby={errors.birthDate ? `${birthId}-error` : undefined}
        />
        {errors.birthDate && (
          <p id={`${birthId}-error`} className="text-destructive">
            {errors.birthDate}
          </p>
        )}
      </div>
    </>
  );
}
