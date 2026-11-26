import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Decision, Person, Settings, Vaccination } from "../model";

export const DB_NAME = "impfpass";
export const DB_VERSION = 1;
export const SETTINGS_KEY = "settings";

/** Stand der Regel-Auswertung je Person (Plan 2). */
export interface RuleState {
  personId: string;
  [key: string]: unknown;
}

/** Stand der GTD-Übergabe je Person (Plan 4). */
export interface GtdState {
  personId: string;
  [key: string]: unknown;
}

export interface ImpfPassDB extends DBSchema {
  persons: { key: string; value: Person };
  vaccinations: {
    key: string;
    value: Vaccination;
    indexes: { byPerson: string };
  };
  decisions: { key: [string, string]; value: Decision };
  ruleStates: { key: string; value: RuleState };
  gtdStates: { key: string; value: GtdState };
  settings: { key: string; value: Settings };
}

export type ImpfPassDatabase = IDBPDatabase<ImpfPassDB>;

export const STORE_NAMES = [
  "persons",
  "vaccinations",
  "decisions",
  "ruleStates",
  "gtdStates",
  "settings",
] as const;

/**
 * Öffnet die Datenbank. Alle Stores entstehen schon in Version 1, damit
 * Plan 2 und Plan 4 keine Migration brauchen.
 */
export function openDatabase(): Promise<ImpfPassDatabase> {
  return openDB<ImpfPassDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("persons", { keyPath: "id" });
        const vaccinations = db.createObjectStore("vaccinations", {
          keyPath: "id",
        });
        vaccinations.createIndex("byPerson", "personId");
        db.createObjectStore("decisions", {
          keyPath: ["personId", "recommendationId"],
        });
        db.createObjectStore("ruleStates", { keyPath: "personId" });
        db.createObjectStore("gtdStates", { keyPath: "personId" });
        db.createObjectStore("settings");
      }
    },
  });
}
