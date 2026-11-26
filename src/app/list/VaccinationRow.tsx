import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/core/dates";
import type { Vaccination } from "@/core/model";
import { diseaseNames, vaccinationName } from "../format";

export function VaccinationRow({
  vaccination: v,
}: {
  vaccination: Vaccination;
}) {
  return (
    <Link
      href={`/impfungen/${v.id}`}
      className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
    >
      <span className="w-24 shrink-0 tabular-nums">
        {formatDate(v.date, v.datePrecision)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium break-words">{vaccinationName(v)}</span>
        <span className="text-muted-foreground">
          {diseaseNames(v.diseases)}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
    </Link>
  );
}
