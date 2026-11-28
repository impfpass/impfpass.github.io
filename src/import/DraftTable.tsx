import { CircleAlert, Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { diseaseLabel } from "@/core/catalog/diseases";
import { getProduct, PRODUCTS } from "@/core/catalog/products";
import { todayISO } from "@/core/dates";
import {
  checkBirthDate,
  checkDraft,
  newRow,
  withDate,
  withDiseases,
  withLabel,
  withProduct,
  type Draft,
  type DraftRow,
  type RowIssue,
  type TextField,
} from "@/core/import/draft";
import { cn } from "@/lib/utils";
import { T } from "@/texts";
import { DeleteDraftButton } from "./DeleteDraftButton";
import { DiseasePicker } from "./DiseasePicker";

const PRODUCT_NAMES = PRODUCTS.map((p) => p.name).sort((a, b) =>
  a.localeCompare(b, "de"),
);
const PRODUCT_ID_BY_NAME = new Map(PRODUCTS.map((p) => [p.name, p.id]));

const DATE_ISSUES: ReadonlySet<RowIssue["kind"]> = new Set([
  "dateMissing",
  "dateInvalid",
  "dateFuture",
  "dateBeforeBirth",
]);

function issueText(issue: RowIssue): string {
  const t = T.pc.issues;
  switch (issue.kind) {
    case "productFuzzy":
      return t.productFuzzy(
        issue.read,
        getProduct(issue.productId)?.name ?? issue.productId,
      );
    case "unsure":
      return t.unsure(issue.fields.map((f) => t.fields[f]));
    case "hint":
      return issue.text;
    case "duplicate":
      return t.duplicate(issue.otherRow);
    default:
      return t[issue.kind];
  }
}

const TEXT_INPUT = { autoComplete: "off" } as const;
// Namen und Chargen nicht verändern lassen (Wunsch des Nutzers, 27.11.2026).
const VERBATIM_INPUT = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

/** Schritt 2: alle Impfungen prüfen und bearbeiten (Spec 8.1). */
export function DraftTable({
  draft,
  update,
  onNext,
  onClear,
}: {
  draft: Draft;
  update(fn: (d: Draft) => Draft): void;
  onNext(): void;
  /** „Entwurf löschen“ ist bestätigt. */
  onClear(): void;
}) {
  const ids = useId();
  const t = T.pc.table;
  const today = todayISO();
  const issues = checkDraft(draft, today);
  const birth = checkBirthDate(draft.birthDate, today);
  // Nur die letzte Löschung lässt sich rückgängig machen.
  const [removed, setRemoved] = useState<{
    row: DraftRow;
    index: number;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Zeile, deren Datumsfeld nach dem Einfügen den Fokus bekommt.
  const focusRow = useRef<string | null>(null);
  // Fokusziele nach „Löschen“ und „Rückgängig“, damit der Fokus nie auf body fällt.
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusUndo = useRef(false);
  const focusRemove = useRef<string | null>(null);

  useEffect(() => {
    if (removed && focusUndo.current) {
      focusUndo.current = false;
      undoRef.current?.focus();
    }
  }, [removed]);

  const issuesOf = (row: DraftRow) => issues.get(row.id) ?? [];
  const withErrors = draft.rows.filter((r) =>
    issuesOf(r).some((i) => i.blocking),
  ).length;
  const withHints = draft.rows.filter((r) => {
    const list = issuesOf(r);
    return list.length > 0 && !list.some((i) => i.blocking);
  }).length;
  const blocked = draft.rows.length === 0 || withErrors > 0;

  function setRows(fn: (rows: DraftRow[]) => DraftRow[]) {
    update((d) => ({ ...d, rows: fn(d.rows) }));
  }

  function changeRow(id: string, fn: (r: DraftRow) => DraftRow) {
    setRows((rows) => rows.map((r) => (r.id === id ? fn(r) : r)));
  }

  function addRow() {
    const row = newRow(crypto.randomUUID());
    focusRow.current = row.id;
    setRows((rows) => [...rows, row]);
  }

  function removeRow(row: DraftRow, index: number) {
    focusUndo.current = true;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    setRemoved({ row, index });
  }

  function undo() {
    if (!removed) return;
    const { row, index } = removed;
    focusRemove.current = row.id;
    setRows((rows) => [...rows.slice(0, index), row, ...rows.slice(index)]);
    setRemoved(null);
  }

  function next() {
    if (blocked) return;
    if (withHints > 0) setConfirming(true);
    else onNext();
  }

  function focusIfNew(id: string, el: HTMLInputElement | null) {
    if (el && focusRow.current === id) {
      focusRow.current = null;
      el.focus();
    }
  }

  function focusRemoveIfRestored(id: string, el: HTMLButtonElement | null) {
    if (el && focusRemove.current === id) {
      focusRemove.current = null;
      el.focus();
    }
  }

  const c = t.columns;
  return (
    <div className="mt-4 space-y-4">
      {(birth === "invalid" || birth === "future") && (
        <p className="flex gap-2 rounded-md border p-3">
          <Info aria-hidden="true" className="mt-1 size-5 shrink-0" />
          {birth === "invalid" ? t.birthInvalid : t.birthFuture}
        </p>
      )}

      {draft.rows.length === 0 ? (
        <p id={`${ids}-empty`}>{t.empty}</p>
      ) : (
        <>
          <p>{t.summary(draft.rows.length, withErrors, withHints)}</p>
          <div className="overflow-x-auto">
            <table
              aria-label={t.label}
              className="w-full min-w-[80rem] table-fixed border-collapse"
            >
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="w-12 p-2">
                    {c.number}
                  </th>
                  <th scope="col" className="w-30 p-2">
                    {c.date}
                  </th>
                  <th scope="col" className="w-44 p-2">
                    {c.label}
                  </th>
                  <th scope="col" className="w-40 p-2">
                    {c.diseases}
                  </th>
                  <th scope="col" className="w-32 p-2">
                    {c.batch}
                  </th>
                  <th scope="col" className="w-80 p-2">
                    {c.doctor}
                  </th>
                  <th scope="col" className="w-28 p-2">
                    {c.note}
                  </th>
                  <th scope="col" className="p-2">
                    {c.issues}
                  </th>
                  <th scope="col" className="w-24 p-2">
                    {c.remove}
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((row, index) => (
                  <RowView
                    key={row.id}
                    row={row}
                    number={index + 1}
                    issues={issuesOf(row)}
                    listId={`${ids}-products`}
                    onChange={(fn) => changeRow(row.id, fn)}
                    onRemove={() => removeRow(row, index)}
                    dateRef={(el) => focusIfNew(row.id, el)}
                    removeRef={(el) => focusRemoveIfRestored(row.id, el)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <datalist id={`${ids}-products`}>
            {PRODUCT_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus aria-hidden="true" />
          {t.add}
        </Button>
        <DeleteDraftButton onConfirm={onClear} />
      </div>

      {/* Der Bereich steht immer im DOM, nur sein Inhalt kommt und geht. */}
      <div
        role="status"
        className={
          removed
            ? "sticky bottom-4 flex flex-wrap items-center gap-3 rounded-md border bg-background p-3 shadow-md"
            : "sr-only"
        }
      >
        {removed && (
          <>
            {t.removed(removed.index + 1)}
            <Button
              ref={undoRef}
              type="button"
              variant="outline"
              onClick={undo}
            >
              {t.undo}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button
          type="button"
          disabled={blocked}
          aria-describedby={
            draft.rows.length === 0
              ? `${ids}-empty`
              : withErrors > 0
                ? `${ids}-blocked`
                : undefined
          }
          onClick={next}
        >
          {t.next}
        </Button>
        {withErrors > 0 && (
          <p id={`${ids}-blocked`} className="flex gap-2 text-destructive">
            <CircleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
            {t.blocked}
          </p>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmHints(withHints)}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.back}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onNext()}>
              {t.transfer}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowView({
  row,
  number,
  issues,
  listId,
  onChange,
  onRemove,
  dateRef,
  removeRef,
}: {
  row: DraftRow;
  number: number;
  issues: RowIssue[];
  listId: string;
  onChange(fn: (r: DraftRow) => DraftRow): void;
  onRemove(): void;
  dateRef(el: HTMLInputElement | null): void;
  removeRef(el: HTMLButtonElement | null): void;
}) {
  const ids = useId();
  const t = T.pc.table;
  const c = t.columns;
  const field = (name: string) => t.field(name, number);
  const hasError = issues.some((i) => i.blocking);
  const hasHints = issues.some((i) => !i.blocking);
  const dateInvalid = issues.some((i) => DATE_ISSUES.has(i.kind));
  const tooLong = issues.flatMap((i) =>
    i.kind === "textTooLong" ? i.fields : [],
  );
  const invalid = (f: TextField) => tooLong.includes(f) || undefined;

  function pick(name: string) {
    const id = PRODUCT_ID_BY_NAME.get(name);
    if (id) onChange((r) => withProduct(r, id));
  }

  return (
    <tr className={cn("border-b align-top", hasError && "bg-destructive/5")}>
      <th
        scope="row"
        className={cn(
          "border-l-4 p-2 pt-4 text-right font-semibold",
          hasError ? "border-l-destructive" : "border-l-transparent",
        )}
      >
        {number}
      </th>
      <td className="p-1 py-2">
        <Input
          {...TEXT_INPUT}
          ref={dateRef}
          aria-label={field(c.date)}
          aria-invalid={dateInvalid || undefined}
          placeholder={t.datePlaceholder}
          value={row.date}
          onChange={(e) => {
            const date = e.target.value;
            onChange((r) => withDate(r, date));
          }}
        />
      </td>
      <td className="p-1 py-2">
        <Input
          {...TEXT_INPUT}
          list={listId}
          aria-label={field(c.label)}
          aria-invalid={invalid("label")}
          value={row.label}
          onChange={(e) => {
            const label = e.target.value;
            onChange((r) => withLabel(r, label));
          }}
        />
      </td>
      <td className="p-1 py-2">
        {row.productId !== null ? (
          <span className="block pt-2">{diseaseLabel(row.diseases)}</span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            {row.diseases.length > 0 && (
              <span>{diseaseLabel(row.diseases)}</span>
            )}
            <DiseasePicker
              value={row.diseases}
              onChange={(d) => onChange((r) => withDiseases(r, d))}
              rowNumber={number}
            />
          </div>
        )}
      </td>
      <td className="p-1 py-2">
        <Input
          {...VERBATIM_INPUT}
          aria-label={field(c.batch)}
          aria-invalid={invalid("batch")}
          value={row.batch}
          onChange={(e) => {
            const batch = e.target.value;
            onChange((r) => ({ ...r, batch }));
          }}
        />
      </td>
      <td className="p-1 py-2">
        <Input
          {...VERBATIM_INPUT}
          aria-label={field(c.doctor)}
          title={row.doctor || undefined}
          aria-invalid={invalid("doctor")}
          value={row.doctor}
          onChange={(e) => {
            const doctor = e.target.value;
            onChange((r) => ({ ...r, doctor }));
          }}
        />
      </td>
      <td className="p-1 py-2">
        <Input
          {...TEXT_INPUT}
          aria-label={field(c.note)}
          aria-invalid={invalid("note")}
          value={row.note}
          onChange={(e) => {
            const note = e.target.value;
            onChange((r) => ({ ...r, note }));
          }}
        />
      </td>
      <td className="p-2">
        {issues.length > 0 && (
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <IssueItem key={i} issue={issue} field={field} onPick={pick} />
            ))}
          </ul>
        )}
        {(hasHints || row.reviewed) && (
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${ids}-reviewed`}
              aria-label={field(t.reviewed)}
              checked={row.reviewed}
              onCheckedChange={(checked) =>
                onChange((r) => ({ ...r, reviewed: checked === true }))
              }
            />
            <Label htmlFor={`${ids}-reviewed`} className="min-h-11">
              {t.reviewed}
            </Label>
          </div>
        )}
      </td>
      <td className="p-1 py-2">
        <Button
          ref={removeRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={field(c.remove)}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="size-5" />
        </Button>
      </td>
    </tr>
  );
}

function IssueItem({
  issue,
  field,
  onPick,
}: {
  issue: RowIssue;
  field(name: string): string;
  onPick(name: string): void;
}) {
  const Icon = issue.blocking ? CircleAlert : Info;
  return (
    <li className={cn("flex gap-2", issue.blocking && "text-destructive")}>
      <Icon aria-hidden="true" className="mt-1 size-5 shrink-0" />
      <span>
        <span className="sr-only">
          {issue.blocking ? T.pc.table.error : T.pc.table.hint}{" "}
        </span>
        {issueText(issue)}
        {issue.kind === "productAmbiguous" && (
          <span className="mt-1 flex flex-wrap gap-2">
            {issue.candidates.map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                aria-label={field(name)}
                onClick={() => onPick(name)}
              >
                {name}
              </Button>
            ))}
          </span>
        )}
      </span>
    </li>
  );
}
