import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DISEASE_IDS, DISEASES, type DiseaseId } from "@/core/catalog/diseases";
import { T } from "@/texts";

/** Krankheiten von Hand wählen, für Zeilen ohne erkannten Impfstoff. */
export function DiseasePicker({
  value,
  onChange,
  rowNumber,
}: {
  value: DiseaseId[];
  onChange(d: DiseaseId[]): void;
  rowNumber: number;
}) {
  const ids = useId();
  const [open, setOpen] = useState(false);
  // Auswahl im offenen Dialog; zählt erst mit „Übernehmen“.
  const [selected, setSelected] = useState<DiseaseId[]>(value);
  const p = T.pc.diseasePicker;
  const trigger = p.open(value.length);

  function openChange(next: boolean) {
    if (next) setSelected(value);
    setOpen(next);
  }

  function toggle(id: DiseaseId, checked: boolean) {
    setSelected((s) => (checked ? [...s, id] : s.filter((d) => d !== id)));
  }

  function confirm() {
    onChange(DISEASE_IDS.filter((id) => selected.includes(id)));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 text-left whitespace-normal"
          aria-label={T.pc.table.field(trigger, rowNumber)}
        >
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{p.title(rowNumber)}</DialogTitle>
          <DialogDescription>{p.description}</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-x-6 sm:grid-cols-2 md:grid-cols-3">
          {DISEASE_IDS.map((id) => (
            <li key={id} className="flex items-center gap-3">
              <Checkbox
                id={`${ids}-${id}`}
                checked={selected.includes(id)}
                onCheckedChange={(c) => toggle(id, c === true)}
              />
              <Label htmlFor={`${ids}-${id}`} className="min-h-11 flex-1">
                {DISEASES[id].name}
              </Label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {T.common.cancel}
            </Button>
          </DialogClose>
          <Button type="button" onClick={confirm}>
            {p.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
