import { IDBFactory } from "fake-indexeddb";
import type { Person, Settings, Vaccination } from "../model";
import { DEFAULT_ANSWERS } from "../model";
import {
  openRepository,
  requestPersistence,
  StorageUnavailableError,
  type BackupData,
  type Repository,
} from "./repository";

const person = (id: string, name = id): Person => ({
  id,
  name,
  birthDate: "1967-03-01",
  answers: DEFAULT_ANSWERS,
  createdAt: "2026-11-26T10:00:00.000Z",
});

const vaccination = (id: string, personId: string): Vaccination => ({
  id,
  personId,
  date: "2020-05-04",
  datePrecision: "day",
  productId: "boostrix-polio",
  label: "Boostrix Polio",
  diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
  source: "manual",
  createdAt: "2026-11-26T10:00:00.000Z",
  updatedAt: "2026-11-26T10:00:00.000Z",
});

let repo: Repository;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  repo = await openRepository();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("speichert und liest Personen und Impfungen getrennt nach Person", async () => {
  await repo.savePerson(person("p1"));
  await repo.savePerson(person("p2"));
  await repo.saveVaccination(vaccination("v1", "p1"));
  await repo.saveVaccination(vaccination("v2", "p2"));

  expect((await repo.getPersons()).map((p) => p.id).sort()).toEqual([
    "p1",
    "p2",
  ]);
  expect((await repo.getVaccinations("p1")).map((v) => v.id)).toEqual(["v1"]);
  expect((await repo.getVaccinations("p2")).map((v) => v.id)).toEqual(["v2"]);
});

it("überschreibt eine Impfung mit gleicher ID", async () => {
  await repo.saveVaccination(vaccination("v1", "p1"));
  await repo.saveVaccination({ ...vaccination("v1", "p1"), note: "neu" });
  const list = await repo.getVaccinations("p1");
  expect(list).toHaveLength(1);
  expect(list[0].note).toBe("neu");
});

it("löscht eine Impfung", async () => {
  await repo.saveVaccination(vaccination("v1", "p1"));
  await repo.deleteVaccination("v1");
  expect(await repo.getVaccinations("p1")).toEqual([]);
});

it("liefert Voreinstellungen ohne gespeicherte Einstellungen", async () => {
  expect(await repo.getSettings()).toEqual({
    leadMonths: 6,
    seasonDay: "09-01",
    listSort: "date-desc",
  });
});

it("speichert Einstellungen", async () => {
  const s: Settings = {
    leadMonths: 3,
    seasonDay: "09-15",
    listSort: "disease",
    lastBackupAt: "2026-11-26T10:00:00.000Z",
  };
  await repo.saveSettings(s);
  expect(await repo.getSettings()).toEqual(s);
});

it("replaceAll ersetzt alles, exportAll liefert es zurück", async () => {
  await repo.savePerson(person("alt"));
  await repo.saveVaccination(vaccination("v-alt", "alt"));
  await repo.saveSettings({
    leadMonths: 1,
    seasonDay: "10-01",
    listSort: "product",
  });

  const data: BackupData = {
    persons: [person("neu", "Christa")],
    vaccinations: [vaccination("v-neu", "neu")],
    decisions: [
      {
        personId: "neu",
        recommendationId: "zoster",
        kind: "declined",
        at: "2026-11-26T10:00:00.000Z",
      },
    ],
    settings: { leadMonths: 6, seasonDay: "09-01", listSort: "date-asc" },
  };
  await repo.replaceAll(data);

  expect(await repo.exportAll()).toEqual(data);
  expect(await repo.getVaccinations("alt")).toEqual([]);
});

it("Daten überstehen das erneute Öffnen", async () => {
  await repo.savePerson(person("p1"));
  const again = await openRepository();
  expect((await again.getPersons()).map((p) => p.id)).toEqual(["p1"]);
});

it("openRepository wirft StorageUnavailableError, wenn IndexedDB fehlt", async () => {
  vi.stubGlobal("indexedDB", undefined);
  await expect(openRepository()).rejects.toBeInstanceOf(
    StorageUnavailableError,
  );
});

it("openRepository wirft StorageUnavailableError, wenn das Öffnen scheitert", async () => {
  vi.stubGlobal("indexedDB", {
    open: () => {
      throw new DOMException("blockiert", "SecurityError");
    },
  });
  await expect(openRepository()).rejects.toBeInstanceOf(
    StorageUnavailableError,
  );
});

it("requestPersistence fragt den Browser, wenn er es kann", async () => {
  const persist = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("navigator", { storage: { persist } });
  expect(await requestPersistence()).toBe(true);
  expect(persist).toHaveBeenCalled();
});

it("requestPersistence liefert false, wenn der Browser es nicht kann", async () => {
  vi.stubGlobal("navigator", {});
  expect(await requestPersistence()).toBe(false);
});

it("replaceAll lässt die alten Daten stehen, wenn ein Eintrag nicht gespeichert werden kann", async () => {
  await repo.savePerson(person("alt"));
  const broken = {
    persons: [{ ...person("neu"), id: undefined }],
    vaccinations: [],
    decisions: [],
    settings: { leadMonths: 6, seasonDay: "09-01", listSort: "date-desc" },
  } as unknown as BackupData;

  await expect(repo.replaceAll(broken)).rejects.toThrow();
  expect((await repo.getPersons()).map((p) => p.id)).toEqual(["alt"]);
});
