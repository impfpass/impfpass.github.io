import type { TransferEntry, Vaccination } from "../model";
import {
  type ImportItem,
  planImport,
  replacementTargets,
  resolveImport,
  toVaccinations,
} from "./merge";

const existing = (overrides: Partial<Vaccination> = {}): Vaccination => ({
  id: "v1",
  personId: "p1",
  date: "2016-12-05",
  datePrecision: "day",
  productId: null,
  label: "Td",
  diseases: ["tetanus", "diphtheria"],
  source: "manual",
  createdAt: "2026-11-26T10:00:00.000Z",
  updatedAt: "2026-11-26T10:00:00.000Z",
  ...overrides,
});

const entry = (overrides: Partial<TransferEntry> = {}): TransferEntry => ({
  date: "2016-12-05",
  datePrecision: "day",
  productId: null,
  label: "Td-pur",
  diseases: ["tetanus"],
  ...overrides,
});

const birth = "1967-03-15";
const today = "2026-11-27";
const plan = (existingOnes: Vaccination[], entries: TransferEntry[]) =>
  planImport(existingOnes, entries, birth, today);

describe("planImport", () => {
  it("markiert gleiches Datum mit überlappender Krankheit", () => {
    const v = existing();
    expect(planImport([v], [entry()], birth, today)).toEqual([
      { entry: entry(), duplicateOf: v, dateIssue: null },
    ]);
  });

  it("markiert auch Monat gegen Tag", () => {
    const v = existing();
    const e = entry({ date: "2016-12-01", datePrecision: "month" });
    expect(plan([v], [e])[0].duplicateOf).toBe(v);
  });

  it("markiert nicht bei anderer Krankheit", () => {
    const e = entry({ diseases: ["polio"] });
    expect(plan([existing()], [e])[0].duplicateOf).toBeNull();
  });

  it("nimmt die erste passende vorhandene Impfung und behält die Reihenfolge", () => {
    const first = existing({ id: "a" });
    const second = existing({ id: "b" });
    const other = entry({ date: "2020-01-01", label: "x" });
    const items = plan([first, second], [other, entry()]);
    expect(items.map((i) => i.entry)).toEqual([other, entry()]);
    expect(items[0].duplicateOf).toBeNull();
    expect(items[1].duplicateOf).toBe(first);
  });

  it("vergleicht Einträge nicht untereinander", () => {
    const items = plan([], [entry(), entry()]);
    expect(items.map((i) => i.duplicateOf)).toEqual([null, null]);
  });

  it("markiert Daten vor dem Geburtsdatum und in der Zukunft, in ihrer Genauigkeit", () => {
    const items = plan(
      [],
      [
        entry({ date: "1967-03-14" }),
        entry({ date: "1967-01-01", datePrecision: "year" }),
        entry({ date: "1966-12-01", datePrecision: "month" }),
        entry({ date: "2026-11-28" }),
        entry({ date: "2026-11-01", datePrecision: "month" }),
        entry({ date: "2027-01-01", datePrecision: "year" }),
      ],
    );
    expect(items.map((i) => i.dateIssue)).toEqual([
      "beforeBirth",
      null,
      "beforeBirth",
      "future",
      null,
      "future",
    ]);
  });
});

describe("toVaccinations", () => {
  const now = new Date("2026-11-27T09:30:00.000Z");
  let n = 0;
  const ctx = () => ({
    personId: "p1",
    importId: "K7Q2M9",
    now,
    newId: () => `id${++n}`,
  });

  beforeEach(() => {
    n = 0;
  });

  it("setzt alle Felder", () => {
    const full = entry({
      productId: "boostrix-polio",
      batch: "AB12",
      doctor: "Dr. Muster",
      note: "links",
    });
    expect(toVaccinations([full, entry()], ctx())).toEqual([
      {
        id: "id1",
        personId: "p1",
        date: "2016-12-05",
        datePrecision: "day",
        productId: "boostrix-polio",
        label: "Td-pur",
        diseases: ["tetanus"],
        batch: "AB12",
        doctor: "Dr. Muster",
        note: "links",
        source: "import",
        importId: "K7Q2M9",
        createdAt: "2026-11-27T09:30:00.000Z",
        updatedAt: "2026-11-27T09:30:00.000Z",
      },
      {
        id: "id2",
        personId: "p1",
        date: "2016-12-05",
        datePrecision: "day",
        productId: null,
        label: "Td-pur",
        diseases: ["tetanus"],
        source: "import",
        importId: "K7Q2M9",
        createdAt: "2026-11-27T09:30:00.000Z",
        updatedAt: "2026-11-27T09:30:00.000Z",
      },
    ]);
  });

  it("schreibt keine Schlüssel ohne Wert", () => {
    const [v] = toVaccinations([entry()], ctx());
    expect(Object.keys(v)).not.toContain("batch");
    expect(Object.keys(v)).not.toContain("doctor");
    expect(Object.keys(v)).not.toContain("note");
  });
});

describe("resolveImport", () => {
  const now = new Date("2026-11-28T08:00:00.000Z");
  let n = 0;
  const ctx = () => ({
    personId: "p1",
    importId: "K7Q2M9",
    now,
    newId: () => `id${++n}`,
  });
  const item = (
    e: TransferEntry,
    duplicateOf: Vaccination | null = null,
  ): ImportItem => ({ entry: e, duplicateOf, dateIssue: null });

  beforeEach(() => {
    n = 0;
  });

  it("legt Einträge ohne Dublette neu an", () => {
    const { vaccinations, replaced } = resolveImport([item(entry())], ctx());
    expect(replaced).toBe(0);
    expect(vaccinations).toHaveLength(1);
    expect(vaccinations[0]).toMatchObject({
      id: "id1",
      label: "Td-pur",
      source: "import",
      createdAt: "2026-11-28T08:00:00.000Z",
    });
  });

  it("ersetzt eine gewählte Dublette mit den Angaben vom PC", () => {
    const old = existing({ batch: "ALT1", doctor: "Dr. Mustr" });
    const fromPc = entry({
      productId: "td-pur",
      label: "Td-pur",
      batch: "NEU2",
      doctor: "Praxis Dr. Muster, Hamburg",
    });
    const { vaccinations, replaced } = resolveImport(
      [item(fromPc, old)],
      ctx(),
    );
    expect(replaced).toBe(1);
    expect(vaccinations).toEqual([
      {
        id: "v1",
        personId: "p1",
        date: "2016-12-05",
        datePrecision: "day",
        productId: "td-pur",
        label: "Td-pur",
        diseases: ["tetanus"],
        batch: "NEU2",
        doctor: "Praxis Dr. Muster, Hamburg",
        source: "import",
        importId: "K7Q2M9",
        createdAt: "2026-11-26T10:00:00.000Z",
        updatedAt: "2026-11-28T08:00:00.000Z",
      },
    ]);
  });

  it("behält Charge, Praxis und Notiz, die der PC-Eintrag nicht hat", () => {
    const old = existing({
      batch: "ALT1",
      doctor: "Dr. Muster",
      note: "links",
    });
    const [v] = resolveImport([item(entry(), old)], ctx()).vaccinations;
    expect(v.batch).toBe("ALT1");
    expect(v.doctor).toBe("Dr. Muster");
    expect(v.note).toBe("links");
  });

  it("behält das genauere Datum der vorhandenen Impfung", () => {
    const old = existing({ date: "2016-12-05", datePrecision: "day" });
    const [v] = resolveImport(
      [item(entry({ date: "2016", datePrecision: "year" }), old)],
      ctx(),
    ).vaccinations;
    expect([v.date, v.datePrecision]).toEqual(["2016-12-05", "day"]);
  });

  it("nimmt das Datum vom PC, wenn es genauer ist", () => {
    const old = existing({ date: "2016", datePrecision: "year" });
    const [v] = resolveImport(
      [item(entry({ date: "2016-12-05", datePrecision: "day" }), old)],
      ctx(),
    ).vaccinations;
    expect([v.date, v.datePrecision]).toEqual(["2016-12-05", "day"]);
  });

  it("ersetzt jede vorhandene Impfung nur einmal, weitere kommen neu dazu", () => {
    const old = existing({ date: "2016", datePrecision: "year" });
    const first = entry({ date: "2016-03-01" });
    const second = entry({ date: "2016-09-01" });
    const { vaccinations, replaced } = resolveImport(
      [item(first, old), item(second, old)],
      ctx(),
    );
    expect(replaced).toBe(1);
    expect(vaccinations.map((v) => [v.id, v.date])).toEqual([
      ["v1", "2016-03-01"],
      ["id2", "2016-09-01"],
    ]);
  });
});

describe("replacementTargets", () => {
  it("ordnet je vorhandener Impfung den ersten gewählten Eintrag zu", () => {
    const old = existing();
    const a: ImportItem = { entry: entry(), duplicateOf: old, dateIssue: null };
    const b: ImportItem = { entry: entry(), duplicateOf: old, dateIssue: null };
    const c: ImportItem = {
      entry: entry(),
      duplicateOf: null,
      dateIssue: null,
    };
    const targets = replacementTargets([a, b, c]);
    expect(targets.get(a)).toBe(old);
    expect(targets.has(b)).toBe(false);
    expect(targets.has(c)).toBe(false);
  });
});
