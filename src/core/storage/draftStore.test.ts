import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { emptyDraft } from "../import/draft";
import { openDraftStore } from "./draftStore";
import { StorageUnavailableError } from "./repository";

const draft = () => ({
  ...emptyDraft(new Date("2026-11-27T10:00:00Z")),
  birthDate: "01.03.1967",
});

it("gibt null zurück, solange nichts gespeichert ist", async () => {
  const store = await openDraftStore();
  expect(await store.load()).toBeNull();
});

it("speichert und lädt den Entwurf", async () => {
  const store = await openDraftStore();
  await store.save(draft());
  expect(await store.load()).toEqual(draft());
});

it("überlebt das erneute Öffnen", async () => {
  await (await openDraftStore()).save(draft());
  expect(await (await openDraftStore()).load()).toEqual(draft());
});

it("clear leert den Speicher", async () => {
  const store = await openDraftStore();
  await store.save(draft());
  await store.clear();
  expect(await store.load()).toBeNull();
});

it("gibt für einen ungültigen Eintrag null zurück", async () => {
  const store = await openDraftStore();
  const db = await openDB("impfpass-import", 1);
  await db.put("draft", { version: 1, rows: "kaputt" }, "current");
  db.close();
  expect(await store.load()).toBeNull();
});

it("wirft StorageUnavailableError ohne IndexedDB", async () => {
  const saved = globalThis.indexedDB;
  // @ts-expect-error Test ohne IndexedDB
  globalThis.indexedDB = undefined;
  try {
    await expect(openDraftStore()).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
  } finally {
    globalThis.indexedDB = saved ?? new IDBFactory();
  }
});
