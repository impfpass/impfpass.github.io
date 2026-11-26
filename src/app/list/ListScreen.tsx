import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ListSort, Vaccination } from "@/core/model";
import { useAppData } from "../data/AppData";
import { T } from "../texts";
import { groupByDisease, groupByProduct, sortByDate } from "./grouping";
import { VaccinationRow } from "./VaccinationRow";

const SORTS: { value: ListSort; label: string }[] = [
  { value: "date-desc", label: T.list.sort.dateDesc },
  { value: "date-asc", label: T.list.sort.dateAsc },
  { value: "product", label: T.list.sort.product },
  { value: "disease", label: T.list.sort.disease },
];

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

  function changeSort(value: string) {
    // Radix meldet "" beim erneuten Antippen der gewählten Stufe.
    if (!value || value === sort) return;
    void actions.saveSettings({ ...settings, listSort: value as ListSort });
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
  } else if (sort === "date-desc" || sort === "date-asc") {
    content = (
      <Rows
        items={sortByDate(vaccinations, sort === "date-asc" ? "asc" : "desc")}
      />
    );
  } else {
    const groups =
      sort === "product"
        ? groupByProduct(vaccinations)
        : groupByDisease(vaccinations);
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
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        value={sort}
        onValueChange={changeSort}
        aria-label={T.list.sort.label}
        className="grid w-full grid-cols-2"
      >
        {SORTS.map((s) => (
          <ToggleGroupItem key={s.value} value={s.value} className="w-full">
            {s.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {content}
    </div>
  );
}
