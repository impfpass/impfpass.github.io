/** Kalenderdatum als String `YYYY-MM-DD`. */
export type ISODate = string;

/** Wie genau ein Datum bekannt ist. Gespeichert wird der früheste mögliche Tag. */
export type DatePrecision = "day" | "month" | "year";

/** Wird in Task 3 auf den Typ aus der Krankheitsliste umgestellt. */
export type DiseaseId = string;

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

export interface Decision {
  personId: string;
  recommendationId: string;
  kind:
    "declined" | "not_needed" | "doctor_recommends" | "doctor_not_applicable";
  reason?: string;
  at: string;
}

export type ListSort = "date-desc" | "date-asc" | "product" | "disease";

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
