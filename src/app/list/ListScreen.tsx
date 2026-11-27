import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { ListSort, Vaccination } from "@/core/model";
import { useAppData } from "../data/AppData";
import { T } from "@/texts";
import { groupByDisease, groupByProduct, sortByDate } from "./grouping";
import { nextSort, splitSort, type SortKey } from "./sortOrder";
import { VaccinationRow } from "./VaccinationRow";

const SORT_KEYS: { key: SortKey; label: string }[] = [
  { key: "date", label: T.list.sort.date },
  { key: "product", label: T.list.sort.product },
  { key: "disease", label: T.list.sort.disease },
];

function directionText(sort: ListSort): string {
  const { key, dir } = splitSort(sort);
  if (key === "date") {
    return dir === "desc" ? T.list.sort.newestFirst : T.list.sort.oldestFirst;
  }
  return dir === "asc" ? T.list.sort.aToZ : T.list.sort.zToA;
}

function Rows({ items }: { items: Vaccination[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {items.map((v) => (
        <li key={v.id}>
          <VaccinationRow vaccination={v} />
        </li>
      ))}
    </ul>
  );
}

export function ListScreen() {
  const { vaccinations, settings, actions } = useAppData();
  const sort = settings.listSort;
  const { key: sortKey, dir } = splitSort(sort);
  const [saveFailed, setSaveFailed] = useState(false);

  function choose(key: SortKey) {
    actions.saveSettings({ ...settings, listSort: nextSort(sort, key) }).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  }

  let content;
  if (vaccinations.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-4 py-6">
        <p>{T.list.empty}</p>
        <Button asChild>
          <Link href="/impfungen/neu">{T.list.addFirst}</Link>
        </Button>
      </div>
    );
  } else if (sortKey === "date") {
    content = <Rows items={sortByDate(vaccinations, dir)} />;
  } else {
    const groups =
      sortKey === "product"
        ? groupByProduct(vaccinations, dir)
        : groupByDisease(vaccinations, dir);
    content = (
      <div className="flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h2 className="mb-1 text-lg font-semibold">{g.title}</h2>
            <Rows items={g.items} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{T.list.title}</h1>
      <div className="flex flex-col gap-1">
        <div
          role="group"
          aria-label={T.list.sort.label}
          className="grid w-full grid-cols-3 gap-2"
        >
          {SORT_KEYS.map((s) => (
            <Button
              key={s.key}
              type="button"
              variant={s.key === sortKey ? "default" : "outline"}
              aria-pressed={s.key === sortKey}
              onClick={() => choose(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <p role="status" className="text-muted-foreground">
          {directionText(sort)}. {T.list.sort.flipHint}
        </p>
        {saveFailed && (
          <p role="alert" className="text-destructive">
            {T.common.saveFailed}
          </p>
        )}
      </div>
      {content}
    </div>
  );
}
