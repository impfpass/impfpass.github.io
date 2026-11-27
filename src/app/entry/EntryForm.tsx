import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DISEASE_IDS, DISEASES, type DiseaseId } from "@/core/catalog/diseases";
import { getProduct, type Product } from "@/core/catalog/products";
import { recognizeProduct, suggestProducts } from "@/core/catalog/recognize";
import { normalizeToPrecision, todayISO } from "@/core/dates";
import type { DatePrecision, Vaccination } from "@/core/model";
import { validateEntry, type EntryErrors } from "@/core/validation";
import { useAppData } from "../data/AppData";
import { diseaseNames } from "../format";
import { T } from "@/texts";
import { BackupHint } from "./BackupHint";

const PRECISIONS: { value: DatePrecision; label: string }[] = [
  { value: "day", label: T.entry.precision.day },
  { value: "month", label: T.entry.precision.month },
  { value: "year", label: T.entry.precision.year },
];

/** Leere Texte weglassen statt als "" zu speichern. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function dateFromInputs(
  precision: DatePrecision,
  day: string,
  month: string,
  year: string,
): string {
  if (precision === "year") return /^\d{4}$/.test(year) ? `${year}-01-01` : "";
  if (precision === "month")
    return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : "";
  return day;
}

function ErrorText({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} className="text-destructive">
      {text}
    </p>
  );
}

/** Neue Impfung eintragen oder eine vorhandene bearbeiten. */
export function EntryForm({
  existing,
  onAddAnother,
  onSaved,
}: {
  existing?: Vaccination;
  /** Nach dem Speichern ein leeres Formular für die nächste Impfung. */
  onAddAnother?: () => void;
  /** Nach erfolgreichem Speichern, wenn die Bestätigung erscheint. */
  onSaved?: () => void;
}) {
  const { person, actions } = useAppData();
  const initialDate = existing?.date ?? todayISO();

  const [precision, setPrecision] = useState<DatePrecision>(
    existing?.datePrecision ?? "day",
  );
  const [day, setDay] = useState(initialDate);
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [year, setYear] = useState(initialDate.slice(0, 4));
  const [label, setLabel] = useState(existing?.label ?? "");
  const [product, setProduct] = useState<Product | undefined>(
    existing?.productId ? getProduct(existing.productId) : undefined,
  );
  const [diseases, setDiseases] = useState<DiseaseId[]>(
    existing && !existing.productId ? existing.diseases : [],
  );
  const [batch, setBatch] = useState(existing?.batch ?? "");
  const [doctor, setDoctor] = useState(existing?.doctor ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [errors, setErrors] = useState<EntryErrors>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Vaccination | null>(null);

  if (!person) return null;

  // Auch nach einem genauen Treffer längere Namen anbieten: „Boostrix“ ist
  // erkannt, „Boostrix Polio“ bleibt wählbar.
  const suggestions = suggestProducts(label).filter(
    (p) => p.id !== product?.id,
  );

  function changeLabel(value: string) {
    setLabel(value);
    // Genau erkannter Name wählt den Impfstoff gleich aus.
    const r = recognizeProduct(value);
    setProduct(r.kind === "exact" ? r.product : undefined);
  }

  /** Datum beim Wechsel der Genauigkeit mitnehmen. */
  function changePrecision(next: DatePrecision) {
    const current = dateFromInputs(precision, day, month, year);
    if (current) {
      setDay(current);
      setMonth(current.slice(0, 7));
      // Ein Jahr wie heute wäre bei „nur Jahr“ fast immer falsch und müsste
      // erst gelöscht werden. Dann lieber leer lassen.
      const y = current.slice(0, 4);
      setYear(y === todayISO().slice(0, 4) ? "" : y);
    }
    setPrecision(next);
  }

  function choose(p: Product) {
    setProduct(p);
    setLabel(p.name);
  }

  function toggleDisease(d: DiseaseId, checked: boolean) {
    setDiseases((list) =>
      checked ? [...list, d] : list.filter((x) => x !== d),
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!person) return;
    const date = dateFromInputs(precision, day, month, year);
    const chosenDiseases = product
      ? product.diseases
      : DISEASE_IDS.filter((d) => diseases.includes(d));
    const input = {
      date,
      datePrecision: precision,
      productId: product?.id ?? null,
      label: label.trim(),
      diseases: chosenDiseases,
    };
    const found = validateEntry(input, person.birthDate, todayISO());
    // Erst die Meldungen zeigen, dann ins erste fehlerhafte Feld springen,
    // damit Screenreader die verknüpfte Meldung mit vorlesen.
    flushSync(() => setErrors(found));
    if (found.date || found.product) {
      const first = found.date ? `entry-${precision}` : "entry-product";
      document.getElementById(first)?.focus();
      return;
    }

    const now = new Date().toISOString();
    const v: Vaccination = {
      id: existing?.id ?? crypto.randomUUID(),
      personId: existing?.personId ?? person.id,
      date: normalizeToPrecision(date, precision),
      datePrecision: precision,
      productId: input.productId,
      label: input.label || diseaseNames(chosenDiseases),
      diseases: chosenDiseases,
      source: existing?.source ?? "manual",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const extras = {
      batch: optional(batch),
      doctor: optional(doctor),
      note: optional(note),
      importId: existing?.importId,
    };
    for (const [key, value] of Object.entries(extras)) {
      if (value !== undefined) Object.assign(v, { [key]: value });
    }

    setBusy(true);
    setFailed(false);
    try {
      await actions.saveVaccination(v);
      setSaved(v);
      onSaved?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const title = existing ? T.entry.editTitle : T.entry.addTitle;

  if (saved) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p role="status">{T.entry.saved}</p>
        <BackupHint />
        <div className="flex flex-col gap-3">
          <Button asChild variant="outline">
            <Link href={`/impfungen/${saved.id}`}>{T.entry.toEntry}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/impfungen">{T.entry.toList}</Link>
          </Button>
          {onAddAnother && (
            <Button type="button" variant="outline" onClick={onAddAnother}>
              {T.entry.addAnother}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <h1 className="text-2xl font-semibold">{title}</h1>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">{T.entry.precision.label}</legend>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          value={precision}
          onValueChange={(v) => v && changePrecision(v as DatePrecision)}
          className="grid w-full grid-cols-3"
        >
          {PRECISIONS.map((p) => (
            <ToggleGroupItem
              key={p.value}
              value={p.value}
              className="h-auto min-h-11 w-full whitespace-normal"
            >
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex flex-col gap-2">
          {precision === "day" && (
            <>
              <Label htmlFor="entry-day">{T.entry.date}</Label>
              <Input
                id="entry-day"
                type="date"
                max={todayISO()}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? "entry-date-error" : undefined}
              />
            </>
          )}
          {precision === "month" && (
            <>
              <Label htmlFor="entry-month">{T.entry.month}</Label>
              <Input
                id="entry-month"
                type="month"
                // Für Browser ohne Monatsauswahl, die ein Textfeld zeigen
                placeholder="JJJJ-MM"
                max={todayISO().slice(0, 7)}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? "entry-date-error" : undefined}
              />
            </>
          )}
          {precision === "year" && (
            <>
              <Label htmlFor="entry-year">{T.entry.year}</Label>
              <Input
                id="entry-year"
                inputMode="numeric"
                maxLength={4}
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? "entry-date-error" : undefined}
              />
            </>
          )}
          <ErrorText id="entry-date-error" text={errors.date} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-product">{T.entry.product}</Label>
        <Input
          id="entry-product"
          autoComplete="off"
          value={label}
          onChange={(e) => changeLabel(e.target.value)}
          aria-describedby={
            errors.product
              ? "entry-product-hint entry-product-error"
              : "entry-product-hint"
          }
          aria-invalid={errors.product ? true : undefined}
        />
        <p id="entry-product-hint" className="text-muted-foreground">
          {T.entry.productHint}
        </p>
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{T.entry.suggestions}</p>
            <ul className="flex flex-col gap-1">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => choose(p)}
                  >
                    {p.name}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {product && (
          <p>
            {T.entry.protectsAgainst}:{" "}
            <span>{diseaseNames(product.diseases)}</span>
          </p>
        )}
      </div>

      {!product && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{T.entry.diseases}</legend>
          <p className="text-muted-foreground">{T.entry.diseasesHint}</p>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {DISEASE_IDS.map((d) => (
              <li key={d}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={diseases.includes(d)}
                    onChange={(e) => toggleDisease(d, e.target.checked)}
                  />
                  {DISEASES[d].name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <ErrorText id="entry-product-error" text={errors.product} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-batch">{T.entry.batch}</Label>
        <Input
          id="entry-batch"
          autoComplete="off"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-doctor">{T.entry.doctor}</Label>
        <Input
          id="entry-doctor"
          value={doctor}
          onChange={(e) => setDoctor(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-note">{T.entry.note}</Label>
        <textarea
          id="entry-note"
          rows={3}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-base"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={busy}>
          {T.entry.save}
        </Button>
        <Button asChild variant="outline">
          <Link href={existing ? `/impfungen/${existing.id}` : "/impfungen"}>
            {T.entry.cancel}
          </Link>
        </Button>
      </div>
    </form>
  );
}
