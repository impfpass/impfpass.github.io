import { ruleStateSchema } from "../formats/schemas";
import type {
  Decision,
  Person,
  RuleState,
  Settings,
  Vaccination,
} from "../model";
import { DEFAULT_SETTINGS, normalizeListSort } from "../model";
import {
  openDatabase,
  SETTINGS_KEY,
  STORE_NAMES,
  type DatabaseEvents,
  type ImpfPassDatabase,
} from "./db";

export type { DatabaseEvents } from "./db";

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
  /** Speichert alle oder keine in einer einzigen Transaktion. */
  addVaccinations(vs: Vaccination[]): Promise<void>;
  getDecisions(personId: string): Promise<Decision[]>;
  /** Eine Entscheidung je Person und Empfehlung; eine neue ersetzt die alte. */
  saveDecision(d: Decision): Promise<void>;
  deleteDecision(personId: string, recommendationId: string): Promise<void>;
  /** null, wenn nichts gespeichert ist oder der Eintrag nicht lesbar ist. */
  getRuleState(personId: string): Promise<RuleState | null>;
  /** Startet die Transaktion beim Aufruf, also in Aufrufreihenfolge. */
  saveRuleState(s: RuleState): Promise<void>;
  /** Voreinstellungen, wenn nichts gespeichert ist. */
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  exportAll(): Promise<BackupData>;
  /** Ersetzt alle Daten in einer einzigen Transaktion. */
  replaceAll(data: BackupData): Promise<void>;
}

export async function openRepository(
  events?: DatabaseEvents,
): Promise<Repository> {
  if (typeof indexedDB === "undefined" || indexedDB === null) {
    throw new StorageUnavailableError();
  }
  let db: ImpfPassDatabase;
  try {
    db = await openDatabase(events);
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
    addVaccinations: async (vs) => {
      if (vs.length === 0) return;
      const tx = db.transaction("vaccinations", "readwrite");
      const requests: Promise<unknown>[] = [];
      try {
        for (const v of vs) requests.push(tx.store.put(v));
      } catch (error) {
        // Ein synchron geworfener Fehler (etwa DataCloneError) bricht die
        // Transaktion nicht von selbst ab; die schon gestellten Einträge
        // würden sonst gespeichert.
        tx.abort();
        await Promise.allSettled([...requests, tx.done]);
        throw error;
      }
      await Promise.all([...requests, tx.done]);
    },
    // Wenige Einträge je Gerät, ein Index lohnt sich nicht.
    getDecisions: async (personId) =>
      (await db.getAll("decisions")).filter((d) => d.personId === personId),
    saveDecision: async (d) => {
      await db.put("decisions", d);
    },
    deleteDecision: (personId, recommendationId) =>
      db.delete("decisions", [personId, recommendationId]),
    getRuleState: async (personId) => {
      const stored: unknown = await db.get("ruleStates", personId);
      if (stored === undefined) return null;
      // Ein unlesbarer Stand wird verworfen und neu berechnet.
      const parsed = ruleStateSchema.safeParse(stored);
      return parsed.success ? parsed.data : null;
    },
    saveRuleState: async (s) => {
      await db.put("ruleStates", s);
    },
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
