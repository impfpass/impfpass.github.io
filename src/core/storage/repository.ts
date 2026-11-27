import type { Decision, Person, Settings, Vaccination } from "../model";
import { DEFAULT_SETTINGS, normalizeListSort } from "../model";
import {
  openDatabase,
  SETTINGS_KEY,
  STORE_NAMES,
  type ImpfPassDatabase,
} from "./db";

/** Der Browser lässt kein Speichern zu, etwa im privaten Modus. */
export class StorageUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("IndexedDB ist nicht verfügbar", options);
    this.name = "StorageUnavailableError";
  }
}

export interface BackupData {
  persons: Person[];
  vaccinations: Vaccination[];
  decisions: Decision[];
  settings: Settings;
}

export interface Repository {
  getPersons(): Promise<Person[]>;
  savePerson(p: Person): Promise<void>;
  getVaccinations(personId: string): Promise<Vaccination[]>;
  saveVaccination(v: Vaccination): Promise<void>;
  deleteVaccination(id: string): Promise<void>;
  /** Voreinstellungen, wenn nichts gespeichert ist. */
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  exportAll(): Promise<BackupData>;
  /** Ersetzt alle Daten in einer einzigen Transaktion. */
  replaceAll(data: BackupData): Promise<void>;
}

export async function openRepository(): Promise<Repository> {
  if (typeof indexedDB === "undefined" || indexedDB === null) {
    throw new StorageUnavailableError();
  }
  let db: ImpfPassDatabase;
  try {
    db = await openDatabase();
  } catch (cause) {
    throw new StorageUnavailableError({ cause });
  }
  return createRepository(db);
}

function createRepository(db: ImpfPassDatabase): Repository {
  const getSettings = async (): Promise<Settings> => {
    const stored = await db.get("settings", SETTINGS_KEY);
    const settings = { ...DEFAULT_SETTINGS, ...stored };
    return { ...settings, listSort: normalizeListSort(settings.listSort) };
  };

  return {
    getPersons: () => db.getAll("persons"),
    savePerson: async (p) => {
      await db.put("persons", p);
    },
    getVaccinations: (personId) =>
      db.getAllFromIndex("vaccinations", "byPerson", personId),
    saveVaccination: async (v) => {
      await db.put("vaccinations", v);
    },
    deleteVaccination: (id) => db.delete("vaccinations", id),
    getSettings,
    saveSettings: async (s) => {
      await db.put("settings", s, SETTINGS_KEY);
    },
    exportAll: async () => {
      const tx = db.transaction(
        ["persons", "vaccinations", "decisions", "settings"],
        "readonly",
      );
      const [persons, vaccinations, decisions, stored] = await Promise.all([
        tx.objectStore("persons").getAll(),
        tx.objectStore("vaccinations").getAll(),
        tx.objectStore("decisions").getAll(),
        tx.objectStore("settings").get(SETTINGS_KEY),
        tx.done,
      ]);
      return {
        persons,
        vaccinations,
        decisions,
        settings: { ...DEFAULT_SETTINGS, ...stored },
      };
    },
    replaceAll: async (data) => {
      // Auch Regel- und GTD-Stand leeren: Sie gehören zu den alten Personen
      // und werden neu berechnet.
      // Anfragen einer Transaktion laufen in der gestellten Reihenfolge, die
      // clear-Aufrufe also vor den put-Aufrufen.
      const tx = db.transaction(STORE_NAMES, "readwrite");
      const requests: Promise<unknown>[] = [];
      try {
        for (const name of STORE_NAMES) {
          requests.push(tx.objectStore(name).clear());
        }
        for (const p of data.persons) {
          requests.push(tx.objectStore("persons").put(p));
        }
        for (const v of data.vaccinations) {
          requests.push(tx.objectStore("vaccinations").put(v));
        }
        for (const d of data.decisions) {
          requests.push(tx.objectStore("decisions").put(d));
        }
        requests.push(
          tx.objectStore("settings").put(data.settings, SETTINGS_KEY),
        );
      } catch (error) {
        // Ein synchron geworfener Fehler (etwa ein Eintrag ohne ID) bricht die
        // Transaktion nicht von selbst ab. Ohne abort() blieben die Stores leer.
        tx.abort();
        await Promise.allSettled([...requests, tx.done]);
        throw error;
      }
      await Promise.all([...requests, tx.done]);
    },
  };
}

/** Bittet den Browser um dauerhaften Speicher. false, wenn er das nicht kann. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) {
      return false;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
