import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DISEASES } from "@/core/catalog/diseases";
import { formatDate } from "@/core/dates";
import { useAppData } from "../data/AppData";
import { T } from "../texts";
import { lastByDisease } from "./lastByDisease";

/** Übergangslösung bis Plan 2: je Krankheit die letzte Impfung. */
export function OverviewScreen() {
  const { vaccinations } = useAppData();
  const rows = lastByDisease(vaccinations);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{T.overview.title}</h1>
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p>{T.list.empty}</p>
          <Button asChild>
            <Link href="/impfungen/neu">{T.list.addFirst}</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y">
          {rows.map(({ disease, last }) => (
            <li key={disease}>
              <Link
                href={`/impfungen/${last.id}`}
                className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{DISEASES[disease].name}</span>
                  <span className="text-muted-foreground">
                    {T.overview.lastVaccinated(
                      formatDate(last.date, last.datePrecision),
                      last.datePrecision,
                    )}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground">{T.overview.later}</p>
    </div>
  );
}
