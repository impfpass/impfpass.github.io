import { openDB, type IDBPDatabase } from "idb";
import { draftSchema } from "../formats/schemas";
import type { Draft } from "../import/draft";
import { StorageUnavailableError } from "./repository";

export const DRAFT_DB_NAME = "impfpass-import";
export const DRAFT_DB_VERSION = 1;
const STORE = "draft";
const KEY = "current";

export interface DraftStore {
  load(): Promise<Draft | null>;
  save(d: Draft): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Öffnet die eigene Datenbank der PC-App. Die Datenbank der Handy-App
 * ("impfpass") wird nicht angefasst.
 */
export async function openDraftStore(): Promise<DraftStore> {
  if (typeof indexedDB === "undefined" || indexedDB === null) {
    throw new StorageUnavailableError();
  }
  let db: IDBPDatabase | undefined;
  try {
    db = await openDB(DRAFT_DB_NAME, DRAFT_DB_VERSION, {
      blocking() {
        db?.close();
      },
      upgrade(db, oldVersion) {
        if (oldVersion < 1) db.createObjectStore(STORE);
      },
    });
  } catch (cause) {
    throw new StorageUnavailableError({ cause });
  }
  const database = db;
  return {
    async load() {
      const value: unknown = await database.get(STORE, KEY);
      const parsed = draftSchema.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
    async save(d) {
      await database.put(STORE, d, KEY);
    },
    async clear() {
      await database.delete(STORE, KEY);
    },
  };
}
