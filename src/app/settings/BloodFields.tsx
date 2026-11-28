import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BLOOD_GROUPS,
  RHESUS_VALUES,
  type BloodGroup,
  type Rhesus,
} from "@/core/model";
import { T } from "@/texts";
import { CHOICE_ITEM_CLASS } from "../styles";

const B = T.settings.blood;
/** Rhesusformeln im Pass sind kurz, etwa „CcD.ee“. */
const FORMULA_MAX = 20;

/** Blutgruppe, Rhesusfaktor und Rhesusformel im Profil; ein zweiter Tipp hebt die Auswahl auf. */
export function BloodFields(props: {
  idPrefix: string;
  group: BloodGroup | undefined;
  rhesus: Rhesus | undefined;
  formula: string;
  onGroup(v: BloodGroup | undefined): void;
  onRhesus(v: Rhesus | undefined): void;
  onFormula(v: string): void;
}) {
  const { idPrefix } = props;
  const groupId = `${idPrefix}-blood-group`;
  const rhesusId = `${idPrefix}-rhesus`;
  const formulaId = `${idPrefix}-rhesus-formula`;
  const clearId = `${idPrefix}-blood-clear`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p id={`${groupId}-label`} className="font-medium">
          {B.group}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          value={props.group ?? ""}
          aria-labelledby={`${groupId}-label`}
          aria-describedby={clearId}
          onValueChange={(v) =>
            props.onGroup(v ? (v as BloodGroup) : undefined)
          }
          className="grid w-full grid-cols-4"
        >
          {BLOOD_GROUPS.map((g) => (
            <ToggleGroupItem key={g} value={g} className={CHOICE_ITEM_CLASS}>
              {B.groups[g]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <p id={`${rhesusId}-label`} className="font-medium">
          {B.rhesus}
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          value={props.rhesus ?? ""}
          aria-labelledby={`${rhesusId}-label`}
          aria-describedby={clearId}
          onValueChange={(v) => props.onRhesus(v ? (v as Rhesus) : undefined)}
          className="grid w-full grid-cols-2"
        >
          {RHESUS_VALUES.map((r) => (
            <ToggleGroupItem key={r} value={r} className={CHOICE_ITEM_CLASS}>
              {B[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p id={clearId} className="text-muted-foreground">
        {B.clearHint}
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={formulaId}>{B.formula}</Label>
        <Input
          id={formulaId}
          value={props.formula}
          onChange={(e) => props.onFormula(e.target.value)}
          maxLength={FORMULA_MAX}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${formulaId}-help`}
        />
        <p id={`${formulaId}-help`} className="text-muted-foreground">
          {B.formulaHelp}
        </p>
      </div>
      <p className="text-muted-foreground">{B.hint}</p>
    </div>
  );
}
