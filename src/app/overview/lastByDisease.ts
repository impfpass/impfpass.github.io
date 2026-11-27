import { DISEASE_IDS, DISEASES, type DiseaseId } from "@/core/catalog/diseases";
import type { Vaccination } from "@/core/model";
import { sortByDate } from "../list/grouping";

/** Neueste Impfung je Krankheit, alphabetisch nach deutschem Namen. */
export function lastByDisease(
  vs: Vaccination[],
): { disease: DiseaseId; last: Vaccination }[] {
  const newestFirst = sortByDate(vs, "desc");
  const result: { disease: DiseaseId; last: Vaccination }[] = [];
  for (const disease of DISEASE_IDS) {
    const last = newestFirst.find((v) => v.diseases.includes(disease));
    if (last) result.push({ disease, last });
  }
  return result.sort((x, y) =>
    DISEASES[x.disease].name.localeCompare(DISEASES[y.disease].name, "de"),
  );
}
