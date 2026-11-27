import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { diseaseLabel } from "@/core/catalog/diseases";
import { formatDate } from "@/core/dates";
import { useAppData } from "../data/AppData";
import { vaccinationName } from "../format";
import { T } from "@/texts";

function BackLink() {
  return (
    <Link
      href="/impfungen"
      className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
      {T.list.title}
    </Link>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

export function EntryDetail({ id }: { id: string }) {
  const { vaccinations, actions } = useAppData();
  const [, navigate] = useLocation();
  const [failed, setFailed] = useState(false);
  const v = vaccinations.find((x) => x.id === id);

  if (!v) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <p>{T.entry.notFound}</p>
      </div>
    );
  }

  const name = vaccinationName(v);

  async function remove() {
    try {
      await actions.deleteVaccination(id);
      navigate("/impfungen");
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <h1 className="text-2xl font-semibold break-words">{name}</h1>
      <dl className="flex flex-col gap-3">
        <Field
          label={T.entry.date}
          value={formatDate(v.date, v.datePrecision)}
        />
        <Field
          label={T.entry.protectsAgainst}
          value={diseaseLabel(v.diseases)}
        />
        {v.label !== name && (
          <Field label={T.entry.labelInPass} value={v.label} />
        )}
        <Field label={T.entry.batch} value={v.batch} />
        <Field label={T.entry.doctor} value={v.doctor} />
        <Field label={T.entry.note} value={v.note} />
        <Field label={T.entry.source.label} value={T.entry.source[v.source]} />
      </dl>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href={`/impfungen/${v.id}/bearbeiten`}>{T.entry.edit}</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">{T.entry.delete}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{T.entry.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {T.entry.deleteText}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{T.common.cancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>
                {T.entry.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
