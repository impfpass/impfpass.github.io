import { DISEASE_IDS, DISEASES, type DiseaseId } from "@/core/catalog/diseases";
import { getProduct } from "@/core/catalog/products";
import type { Vaccination } from "@/core/model";

/** Produktname, sonst die eingegebene Bezeichnung. */
export function vaccinationName(v: Vaccination): string {
  return (v.productId && getProduct(v.productId)?.name) || v.label;
}

/** Deutsche Krankheitsnamen in der Reihenfolge der Krankheitsliste. */
export function diseaseNames(ids: readonly DiseaseId[]): string {
  return DISEASE_IDS.filter((d) => ids.includes(d))
    .map((d) => DISEASES[d].name)
    .join(", ");
}
