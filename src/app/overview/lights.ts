import type { DiseaseId } from "@/core/catalog/diseases";
import type { Vaccination } from "@/core/model";
import type { Recommendation } from "@/core/rules/types";
import { T } from "@/texts";
import { lastByDisease } from "./lastByDisease";

export type Light = "red" | "yellow" | "green" | "grey";

export function lightOf(r: Recommendation): Light | null {
  switch (r.status) {
    case "overdue":
    case "due":
      return r.timing === "season" ? "yellow" : "red";
    case "soon":
      return "yellow";
    case "protected":
      return "green";
    case "future":
      return "grey";
    default:
      return null;
  }
}

export interface OverviewGroups {
  red: Recommendation[];
  yellow: Recommendation[];
  green: Recommendation[];
  grey: Recommendation[];
  discuss: Recommendation[];
  /** declined, not_needed */
  hidden: Recommendation[];
  /** Krankheiten mit Einträgen ohne angezeigte Empfehlung. */
  others: { disease: DiseaseId; last: Vaccination }[];
}

const nameOf = (r: Recommendation) => T.rec.names[r.id] ?? r.id;
const byName = (a: Recommendation, b: Recommendation) =>
  nameOf(a).localeCompare(nameOf(b), "de");

export function groupForOverview(
  recs: Recommendation[],
  vaccinations: Vaccination[],
): OverviewGroups {
  const groups: OverviewGroups = {
    red: [],
    yellow: [],
    green: [],
    grey: [],
    discuss: [],
    hidden: [],
    others: [],
  };
  const covered = new Set<DiseaseId>();
  for (const r of recs) {
    const light = lightOf(r);
    if (light) groups[light].push(r);
    else if (r.status === "discuss") groups.discuss.push(r);
    else if (r.status === "declined" || r.status === "not_needed")
      groups.hidden.push(r);
    else continue;
    for (const d of r.diseases) covered.add(d);
  }
  for (const key of [
    "red",
    "yellow",
    "green",
    "grey",
    "discuss",
    "hidden",
  ] as const)
    groups[key].sort(byName);
  groups.others = lastByDisease(vaccinations).filter(
    (o) => !covered.has(o.disease),
  );
  return groups;
}
