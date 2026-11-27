import { DEFAULT_ANSWERS, DEFAULT_SETTINGS } from "../model";
import type { BackupData } from "../storage/repository";
import {
  BackupError,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
} from "./backup";

const now = new Date("2026-11-26T14:00:00Z");

const data: BackupData = {
  persons: [
    {
      id: "p1",
      name: "Christa",
      birthDate: "1967-03-01",
      answers: DEFAULT_ANSWERS,
      createdAt: "2026-11-26T10:00:00.000Z",
    },
  ],
  vaccinations: [
    {
      id: "v1",
      personId: "p1",
      date: "2016-12-01",
      datePrecision: "month",
      productId: "boostrix-polio",
      label: "Boostrix Polio",
      diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
      batch: "AC52B123",
      doctor: "Dr. Muster",
      source: "manual",
      createdAt: "2026-11-26T10:00:00.000Z",
      updatedAt: "2026-11-26T10:00:00.000Z",
    },
    {
      id: "v2",
      personId: "p1",
      date: "1975-01-01",
      datePrecision: "year",
      productId: null,
      label: "Pocken",
      diseases: ["smallpox"],
      source: "manual",
      createdAt: "2026-11-26T10:00:00.000Z",
      updatedAt: "2026-11-26T10:00:00.000Z",
    },
  ],
  decisions: [],
  settings: { ...DEFAULT_SETTINGS, lastBackupAt: "2026-11-01T08:00:00.000Z" },
};

const validFile = () => JSON.parse(serializeBackup(createBackup(data, now)));

it("Sortierung älterer Versionen wird umgesetzt, unbekannte wird Standard", () => {
  const file = validFile();
  file.settings.listSort = "product";
  expect(parseBackup(JSON.stringify(file)).settings.listSort).toBe(
    "product-asc",
  );
  file.settings.listSort = "unbekannt";
  expect(parseBackup(JSON.stringify(file)).settings.listSort).toBe("date-desc");
});

it("Hin- und Rückweg ergibt dieselben Daten", () => {
  const backup = createBackup(data, now);
  expect(backup).toMatchObject({
    format: "impfpass-backup",
    version: 1,
    createdAt: "2026-11-26T14:00:00.000Z",
  });
  expect(parseBackup(serializeBackup(backup))).toEqual(backup);
});

it("serialisiert mit zwei Leerzeichen Einzug", () => {
  expect(serializeBackup(createBackup(data, now))).toContain(
    '\n  "format": "impfpass-backup"',
  );
});

it("lehnt fremdes JSON ab", () => {
  expect(() => parseBackup('{"foo":1}')).toThrow("keine ImpfPass-Sicherung");
});

it("lehnt Nicht-JSON ab", () => {
  expect(() => parseBackup("hallo")).toThrow("keine ImpfPass-Sicherung");
  expect(() => parseBackup("null")).toThrow("keine ImpfPass-Sicherung");
});

it("lehnt neuere Version ab", () => {
  const file = { ...validFile(), version: 2 };
  expect(() => parseBackup(JSON.stringify(file))).toThrow("neueren Version");
});

it("lehnt beschädigte Einträge ab", () => {
  const file = validFile();
  delete file.vaccinations[0].date;
  expect(() => parseBackup(JSON.stringify(file))).toThrow("beschädigt");
});

it("lehnt ungültige Daten und unbekannte Krankheiten ab", () => {
  const badDate = validFile();
  badDate.vaccinations[0].date = "2016-02-30";
  expect(() => parseBackup(JSON.stringify(badDate))).toThrow("beschädigt");

  const badDisease = validFile();
  badDisease.vaccinations[0].diseases = ["schnupfen"];
  expect(() => parseBackup(JSON.stringify(badDisease))).toThrow("beschädigt");
});

it("lehnt eine Sicherung ohne Version ab", () => {
  const file = validFile();
  delete file.version;
  expect(() => parseBackup(JSON.stringify(file))).toThrow("beschädigt");
});

it("Fehler sind BackupError", () => {
  expect(() => parseBackup("hallo")).toThrow(BackupError);
});

it("Dateiname mit lokalem Datum", () => {
  expect(backupFileName(new Date("2026-03-01T23:30:00Z"))).toBe(
    "impfpass-sicherung-2026-03-02.json",
  );
});
