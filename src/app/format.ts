import { getProduct } from "@/core/catalog/products";
import type { Vaccination } from "@/core/model";

/** Produktname, sonst die eingegebene Bezeichnung. */
export function vaccinationName(v: Vaccination): string {
  return (v.productId && getProduct(v.productId)?.name) || v.label;
}
