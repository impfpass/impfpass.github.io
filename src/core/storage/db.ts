import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Decision,
  GtdState,
  Person,
  RuleState,
  Settings,
  Vaccination,
} from "../model";

export const DB_NAME = "impfpass";
export const DB_VERSION = 1;
export const SETTINGS_KEY = "settings";

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

export interface DatabaseEvents {
  /**
   * Eine neuere App-Version (etwa in einem anderen Tab) will die Datenbank
   * aktualisieren. Die Verbindung ist dann schon geschlossen; die App sollte
   * neu laden, um die neue Version zu bekommen.
   */
  onVersionChange?: () => void;
  /** Der Browser hat die Verbindung abgebrochen (kommt in WebKit vor). */
  onTerminated?: () => void;
}

/**
 * Öffnet die Datenbank. Alle Stores entstehen schon in Version 1, damit
 * Plan 2 und Plan 4 keine Migration brauchen.
 */
export async function openDatabase(
  events: DatabaseEvents = {},
): Promise<ImpfPassDatabase> {
  const db = await openDB<ImpfPassDB>(DB_NAME, DB_VERSION, {
    blocking() {
      // Ohne Schließen bliebe die neuere Version hängen, bis jeder Tab mit
      // dieser Version zu ist.
      db.close();
      events.onVersionChange?.();
    },
    terminated() {
      events.onTerminated?.();
    },
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
  return db;
}
