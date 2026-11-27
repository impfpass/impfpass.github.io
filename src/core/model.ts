import type { DiseaseId } from "./catalog/diseases";

export type { DiseaseId };

/** Kalenderdatum als String `YYYY-MM-DD`. */
export type ISODate = string;

/** Wie genau ein Datum bekannt ist. Gespeichert wird der früheste mögliche Tag. */
export type DatePrecision = "day" | "month" | "year";

export interface PersonAnswers {
  chronicIllness: boolean;
  fsme: "yes" | "no" | "open";
  job: {
    patients: boolean;
    communityFacility: boolean;
    bloodContact: boolean;
    animalContact: boolean;
  };
}

export interface Person {
  id: string;
  name: string;
  birthDate: ISODate;
  answers: PersonAnswers;
  createdAt: string;
}

export interface Vaccination {
  id: string;
  personId: string;
  date: ISODate;
  datePrecision: DatePrecision;
  productId: string | null;
  /** Bezeichnung wie im Pass oder wie eingegeben. */
  label: string;
  diseases: DiseaseId[];
  batch?: string;
  doctor?: string;
  note?: string;
  source: "manual" | "import";
  importId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Eine Impfung in der Übertragung vom PC aufs Handy (Spec 8.2). */
export interface TransferEntry {
  date: ISODate;
  datePrecision: DatePrecision;
  productId: string | null;
  /** Nie leer: sonst der Name des Impfstoffs oder die Namen der Krankheiten. */
  label: string;
  /** Immer gefüllt. */
  diseases: DiseaseId[];
  batch?: string;
  doctor?: string;
  note?: string;
}

export interface TransferPayload {
  /** Sechs Zeichen aus 0-9 und A-Z, steht auch in jeder Teilzeile. */
  id: string;
  createdAt: string;
  entries: TransferEntry[];
}

export interface Decision {
  personId: string;
  recommendationId: string;
  kind:
    "declined" | "not_needed" | "doctor_recommends" | "doctor_not_applicable";
  reason?: string;
  at: string;
}

/** Sortierung der Impfliste: wonach und in welche Richtung. */
export type ListSort =
  | "date-desc"
  | "date-asc"
  | "product-asc"
  | "product-desc"
  | "disease-asc"
  | "disease-desc";

const LIST_SORTS: readonly string[] = [
  "date-desc",
  "date-asc",
  "product-asc",
  "product-desc",
  "disease-asc",
  "disease-desc",
] satisfies ListSort[];

/**
 * Macht aus einem gespeicherten Wert eine gültige Sortierung. Bis Commit
 * fef589e hieß es "product" bzw. "disease" (immer A bis Z); unbekannte Werte
 * ergeben die Voreinstellung.
 */
export function normalizeListSort(value: unknown): ListSort {
  if (value === "product") return "product-asc";
  if (value === "disease") return "disease-asc";
  if (typeof value === "string" && LIST_SORTS.includes(value)) {
    return value as ListSort;
  }
  return "date-desc";
}

export interface Settings {
  leadMonths: number;
  /** Tag für Saison-Erinnerungen als `MM-DD`. */
  seasonDay: string;
  listSort: ListSort;
  gtdUrl?: string;
  lastBackupAt?: string;
  installHintDismissed?: boolean;
}

export const DEFAULT_ANSWERS: PersonAnswers = {
  chronicIllness: false,
  fsme: "open",
  job: {
    patients: false,
    communityFacility: false,
    bloodContact: false,
    animalContact: false,
  },
};

export const DEFAULT_SETTINGS: Settings = {
  leadMonths: 6,
  seasonDay: "09-01",
  listSort: "date-desc",
};

/** Eintrag im Schnappschuss der zutreffenden Empfehlungen (Plan 2, Spec 7.4). */
export interface SnapshotEntry {
  id: string;
  dueDate: ISODate | null;
  dose: number | null;
  season: boolean;
}

export interface Notice {
  kind: "new" | "changed" | "dropped";
  recommendationId: string;
  /** Text aus der Änderungsliste, null wenn es keinen passenden Eintrag gibt. */
  text: string | null;
  validSince: ISODate | null;
}

/** Stand der Regel-Auswertung je Person. */
export interface RuleState {
  personId: string;
  seenVersion: string;
  snapshot: SnapshotEntry[];
  notices: Notice[];
}
