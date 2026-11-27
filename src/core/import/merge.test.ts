import type { TransferEntry, Vaccination } from "../model";
import { planImport, toVaccinations } from "./merge";

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

describe("planImport", () => {
  it("markiert gleiches Datum mit überlappender Krankheit", () => {
    const v = existing();
    expect(planImport([v], [entry()])).toEqual([
      { entry: entry(), duplicateOf: v },
    ]);
  });

  it("markiert auch Monat gegen Tag", () => {
    const v = existing();
    const e = entry({ date: "2016-12-01", datePrecision: "month" });
    expect(planImport([v], [e])[0].duplicateOf).toBe(v);
  });

  it("markiert nicht bei anderer Krankheit", () => {
    const e = entry({ diseases: ["polio"] });
    expect(planImport([existing()], [e])[0].duplicateOf).toBeNull();
  });

  it("nimmt die erste passende vorhandene Impfung und behält die Reihenfolge", () => {
    const first = existing({ id: "a" });
    const second = existing({ id: "b" });
    const other = entry({ date: "2020-01-01", label: "x" });
    const plan = planImport([first, second], [other, entry()]);
    expect(plan.map((i) => i.entry)).toEqual([other, entry()]);
    expect(plan[0].duplicateOf).toBeNull();
    expect(plan[1].duplicateOf).toBe(first);
  });

  it("vergleicht Einträge nicht untereinander", () => {
    const plan = planImport([], [entry(), entry()]);
    expect(plan.map((i) => i.duplicateOf)).toEqual([null, null]);
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
