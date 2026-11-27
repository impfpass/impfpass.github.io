import type {
  Decision,
  DiseaseId,
  ISODate,
  Person,
  Vaccination,
} from "../model";

export type RecommendationId =
  | "td"
  | "pertussis"
  | "polio"
  | "mmr"
  | "varicella"
  | "hepatitis_b"
  | "influenza"
  | "covid19"
  | "pneumococcal"
  | "zoster"
  | "rsv"
  | "tbe";

export type RecStatus =
  | "protected"
  | "soon"
  | "due"
  | "overdue"
  | "future"
  | "discuss"
  | "not_applicable"
  | "declined"
  | "not_needed";

export type Timing = "normal" | "season" | "follow_up";

export type Reason =
  | { kind: "booster"; lastDate: ISODate; intervalYears: number }
  // Termin frühestens so viele Jahre nach einer früheren Dosis (Pneumokokken)
  | { kind: "after_dose"; lastDate: ISODate; intervalYears: number }
  | { kind: "age"; age: number }
  | { kind: "series"; given: number; total: number }
  | { kind: "catch_up"; given: number; total: number }
  | { kind: "with_td" } // Keuchhusten mit der nächsten Td-Impfung
  | { kind: "season"; label: string } // label etwa '2026/27'
  | { kind: "indication"; indication: "job" | "tbe" | "doctor" }
  | { kind: "complete" }
  | { kind: "discuss"; topic: "chronic" | "serology"; normalAge: number | null }
  | { kind: "none" };

export interface SourceRef {
  edition: string;
  date: ISODate;
  section: string;
  page: number | null;
  url: string;
}

export interface Recommendation {
  id: RecommendationId;
  diseases: DiseaseId[];
  status: RecStatus;
  /** Fälligkeit; bei Serien frühester Termin der nächsten Dosis; null = sofort bzw. ohne Datum. */
  dueDate: ISODate | null;
  /** Spätester Termin der nächsten Dosis, sonst null. */
  latestDate: ISODate | null;
  dose: { number: number; of: number } | null;
  timing: Timing;
  reason: Reason;
  source: SourceRef;
}

export interface RuleContext {
  person: Person;
  vaccinations: Vaccination[];
  decision: Decision | undefined;
  today: ISODate;
  leadMonths: number;
  seasonDay: string; // 'MM-DD'
}

export type RuleResult = Omit<Recommendation, "id" | "diseases" | "source"> & {
  source?: SourceRef;
};

export interface Rule {
  id: RecommendationId;
  diseases: DiseaseId[];
  source: SourceRef;
  discussTopic?: "chronic" | "serology";
  /** Zielgruppe, wie die STIKO sie beschreibt (Text der Karte). */
  discussTargetGroup?: string;
  /**
   * Die STIKO empfiehlt die Impfung allen ab einem Alter und bei
   * Grunderkrankung früher; dann nennt die Detailansicht das.
   */
  discussEarlier?: boolean;
  evaluate(ctx: RuleContext): RuleResult;
}

export interface Change {
  version: string;
  ids: string[];
  validSince: ISODate;
  text: string;
}

export interface Rulebook {
  /** 'YYYY-MM-DD.N' */
  version: string;
  /** STIKO-Stand für die Anzeige. */
  edition: string;
  sources: { label: string; url: string }[];
  changes: Change[];
  rules: Rule[];
}
