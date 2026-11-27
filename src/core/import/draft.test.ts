import { draftSchema } from "../formats/schemas";
import { MAX_TEXT_LENGTH, MAX_TRANSFER_ENTRIES } from "../formats/transfer";
import type { ParsedRow } from "./chatbot";
import {
  checkBirthDate,
  checkDraft,
  draftToEntries,
  emptyDraft,
  newRow,
  rowFromParsed,
  withDate,
  withDiseases,
  withLabel,
  withProduct,
  type Draft,
  type DraftRow,
  type RowIssue,
} from "./draft";

const today = "2026-11-27";

const draftOf = (rows: DraftRow[], birthDate = "15.03.1967"): Draft => ({
  ...emptyDraft(new Date("2026-11-27T10:00:00Z")),
  birthDate,
  rows,
});
const row = (id: string, date: string, label = "Boostrix Polio"): DraftRow =>
  withLabel({ ...newRow(id), date }, label);
const issuesOf = (r: DraftRow, birthDate?: string): RowIssue[] =>
  checkDraft(draftOf([r], birthDate), today).get(r.id) ?? [];
const kinds = (r: DraftRow, birthDate?: string) =>
  issuesOf(r, birthDate).map((i) => i.kind);

describe("withLabel", () => {
  it("erkennt den Impfstoff und übernimmt die Krankheiten", () => {
    const r = withLabel(newRow("a"), "Boostrix Polio");
    expect(r.productId).toBe("boostrix-polio");
    expect(r.diseases).toEqual(["tetanus", "diphtheria", "pertussis", "polio"]);
  });

  it("erkennt unscharf und meldet es", () => {
    const r = row("a", "05.12.2016", "Bostrix Polio");
    expect(r.productId).toBe("boostrix-polio");
    expect(r.label).toBe("Bostrix Polio");
    expect(issuesOf(r)).toContainEqual({
      kind: "productFuzzy",
      read: "Bostrix Polio",
      productId: "boostrix-polio",
      blocking: false,
    });
  });

  it("meldet mehrdeutige Namen mit Kandidaten", () => {
    const r = row("a", "05.12.2016", "Prevenar");
    expect(r.productId).toBeNull();
    const issue = issuesOf(r).find((i) => i.kind === "productAmbiguous");
    expect(issue?.blocking).toBe(false);
    expect(
      issue?.kind === "productAmbiguous" && [...issue.candidates].sort(),
    ).toEqual(["Prevenar 13", "Prevenar 20"]);
  });

  it("unbekannt ohne Krankheiten ist ein Fehler", () => {
    const r = row("a", "05.12.2016", "Zzzqx Unbekannt");
    expect(r.productId).toBeNull();
    expect(kinds(r)).toEqual(["noDisease"]);
  });

  it("unbekannt mit Krankheiten ist nur ein Hinweis", () => {
    const r = withDiseases(row("a", "05.12.2016", "Zzzqx Unbekannt"), [
      "tetanus",
    ]);
    expect(kinds(r)).toEqual(["productUnknown"]);
  });

  it("leert beim Wechsel von einem Impfstoff zu einem unbekannten Namen die Krankheiten", () => {
    const r = withLabel(row("a", "05.12.2016"), "Zzzqx Unbekannt");
    expect(r.productId).toBeNull();
    expect(r.diseases).toEqual([]);
    expect(kinds(r)).toEqual(["noDisease"]);
  });

  it("behält von Hand gewählte Krankheiten, wenn der Name unbekannt bleibt", () => {
    const picked = withDiseases(row("a", "05.12.2016", "Zzzqx"), ["tetanus"]);
    const r = withLabel(picked, "Zzzqx Unbekannt");
    expect(r.diseases).toEqual(["tetanus"]);
    expect(withLabel(picked, "Prevenar").diseases).toEqual(["tetanus"]);
  });

  it("geprüfte Zeile, Wechsel zu „Gardasi 9“: mehrdeutig und ohne Krankheit", () => {
    const reviewed = { ...row("a", "05.12.2016"), reviewed: true };
    const r = withLabel(reviewed, "Gardasi 9");
    expect(r.reviewed).toBe(false);
    expect(r.diseases).toEqual([]);
    const issues = issuesOf(r);
    expect(issues.map((i) => i.kind)).toEqual([
      "noDisease",
      "productAmbiguous",
    ]);
    const ambiguous = issues.find((i) => i.kind === "productAmbiguous");
    expect(
      ambiguous?.kind === "productAmbiguous" &&
        [...ambiguous.candidates].sort(),
    ).toEqual(["Gardasil", "Gardasil 9"]);
  });

  it("trimmt nicht", () => {
    expect(withLabel(newRow("a"), "Boostrix Polio ").label).toBe(
      "Boostrix Polio ",
    );
  });
});

describe("withProduct und withDiseases", () => {
  it("withProduct setzt Name und Krankheiten", () => {
    const r = withProduct(newRow("a"), "boostrix-polio");
    expect(r.label).toBe("Boostrix Polio");
    expect(r.diseases).toHaveLength(4);
  });

  it("withDiseases ändert eine Zeile mit Impfstoff nicht", () => {
    const r = row("a", "05.12.2016");
    expect(withDiseases(r, ["measles"])).toBe(r);
  });

  it("withDiseases setzt Krankheiten ohne Impfstoff", () => {
    expect(withDiseases(newRow("a"), ["measles"]).diseases).toEqual([
      "measles",
    ]);
  });
});

describe("„Hinweise geprüft“ nach Änderungen", () => {
  const reviewed: DraftRow = {
    ...row("a", "05.12.2016", "Bostrix Polio"),
    reviewed: true,
  };

  it("Datum, Impfstoff und Krankheiten setzen es zurück", () => {
    expect(withDate(reviewed, "06.12.2016")).toMatchObject({
      date: "06.12.2016",
      reviewed: false,
    });
    expect(withLabel(reviewed, "Boostrix").reviewed).toBe(false);
    expect(withProduct(reviewed, "repevax").reviewed).toBe(false);
    const free = { ...withLabel(newRow("b"), "Zzzqx"), reviewed: true };
    expect(withDiseases(free, ["tetanus"]).reviewed).toBe(false);
  });

  it("nach einer Änderung des Datums sind die Hinweise wieder da", () => {
    expect(kinds(reviewed)).toEqual([]);
    expect(kinds(withDate(reviewed, "06.12.2016"))).toEqual(["productFuzzy"]);
  });
});

describe("rowFromParsed", () => {
  it("übernimmt die Felder und erkennt den Impfstoff", () => {
    const p: ParsedRow = {
      date: "05.12.2016",
      label: "Boostrix Polio",
      batch: "AC52",
      doctor: "Dr. Muster",
      diseases: [],
      unsure: ["batch"],
      hints: ["Hinweis"],
    };
    expect(rowFromParsed(p, "x")).toMatchObject({
      id: "x",
      date: "05.12.2016",
      productId: "boostrix-polio",
      batch: "AC52",
      doctor: "Dr. Muster",
      unsure: ["batch"],
      hints: ["Hinweis"],
      reviewed: false,
    });
  });
});

describe("checkBirthDate", () => {
  it.each([
    ["15.03.1967", "ok"],
    ["", "empty"],
    ["31.02.1967", "invalid"],
    ["03.1967", "invalid"],
    ["1967", "invalid"],
    ["01.01.2027", "future"],
  ])("%j ergibt %s", (raw, expected) => {
    expect(checkBirthDate(raw, today)).toBe(expected);
  });
});

describe("Datum prüfen", () => {
  it("leer, unlesbar", () => {
    expect(kinds(row("a", ""))).toEqual(["dateMissing"]);
    expect(kinds(row("a", "31.02.2016"))).toEqual(["dateInvalid"]);
  });

  it("vergleicht in der bekannten Genauigkeit", () => {
    expect(kinds(row("a", "11.2026"))).toEqual([]);
    expect(kinds(row("a", "12.2026"))).toEqual(["dateFuture"]);
    expect(kinds(row("a", "01.2027"))).toEqual(["dateFuture"]);
    expect(kinds(row("a", "28.11.2026"))).toEqual(["dateFuture"]);
    expect(kinds(row("a", "1967"))).toEqual([]);
    expect(kinds(row("a", "02.1967"))).toEqual(["dateBeforeBirth"]);
    expect(kinds(row("a", "14.03.1967"))).toEqual(["dateBeforeBirth"]);
  });

  it("ohne Geburtsdatum keine Prüfung darauf", () => {
    expect(kinds(row("a", "02.1960"), "")).toEqual([]);
    expect(kinds(row("a", "02.1960"), "kaputt")).toEqual([]);
  });
});

describe("Hinweise", () => {
  const parsed: DraftRow = {
    ...row("a", "05.12.2016"),
    unsure: ["batch", "date"],
    hints: ["Krankheit „X“ nicht erkannt."],
  };

  it("unsichere Felder und Hinweise des Chatbots", () => {
    expect(issuesOf(parsed)).toEqual([
      { kind: "unsure", fields: ["batch", "date"], blocking: false },
      { kind: "hint", text: "Krankheit „X“ nicht erkannt.", blocking: false },
    ]);
  });

  it("mit reviewed verschwinden die Hinweise, Fehler bleiben", () => {
    expect(kinds({ ...parsed, reviewed: true })).toEqual([]);
    expect(kinds({ ...parsed, date: "", reviewed: true })).toEqual([
      "dateMissing",
    ]);
  });
});

describe("Dubletten", () => {
  it("Zeilen 2 und 5 verweisen aufeinander, jede Zeile hat einen Eintrag", () => {
    const rows = [
      row("r1", "01.01.2015"),
      row("r2", "05.12.2016"),
      row("r3", "06.12.2016"),
      row("r4", ""),
      row("r5", "05.12.2016", "Boostrix"),
    ];
    const issues = checkDraft(draftOf(rows), today);
    const dup = (id: string) =>
      issues.get(id)?.filter((i) => i.kind === "duplicate");
    expect(dup("r2")).toEqual([
      { kind: "duplicate", otherRow: 5, blocking: false },
    ]);
    expect(dup("r5")).toEqual([
      { kind: "duplicate", otherRow: 2, blocking: false },
    ]);
    expect(dup("r1")).toEqual([]);
    expect(dup("r4")).toEqual([]);
    expect([...issues.keys()]).toEqual(["r1", "r2", "r3", "r4", "r5"]);
  });

  it("bei mehreren Dubletten ein Eintrag je andere Zeile", () => {
    const rows = ["a", "b", "c"].map((id) => row(id, "05.12.2016"));
    const dups = checkDraft(draftOf(rows), today)
      .get("a")
      ?.filter((i) => i.kind === "duplicate");
    expect(dups).toEqual([
      { kind: "duplicate", otherRow: 2, blocking: false },
      { kind: "duplicate", otherRow: 3, blocking: false },
    ]);
  });
});

describe("Textlänge", () => {
  it("zu langer Text ist ein Fehler", () => {
    const long = "x".repeat(MAX_TEXT_LENGTH + 1);
    const r = { ...row("a", "05.12.2016"), batch: long, note: long };
    expect(issuesOf(r)).toContainEqual({
      kind: "textTooLong",
      fields: ["batch", "note"],
      blocking: true,
    });
    expect(() => draftToEntries(draftOf([r]), today)).toThrow();
  });

  it("genau die Höchstlänge ist erlaubt", () => {
    const r = {
      ...row("a", "05.12.2016"),
      doctor: "x".repeat(MAX_TEXT_LENGTH),
    };
    expect(kinds(r)).toEqual([]);
  });
});

describe("draftToEntries", () => {
  it("wandelt Zeilen in Einträge", () => {
    const r = { ...row("a", "05.12.2016"), batch: " ", doctor: " Dr. M " };
    expect(draftToEntries(draftOf([r]), today)).toEqual([
      {
        date: "2016-12-05",
        datePrecision: "day",
        productId: "boostrix-polio",
        label: "Boostrix Polio",
        diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
        doctor: "Dr. M",
      },
    ]);
  });

  it("ohne Label gilt der Name der Krankheiten", () => {
    const r = withDiseases({ ...newRow("a"), date: "2016" }, [
      "tetanus",
      "diphtheria",
    ]);
    expect(draftToEntries(draftOf([r]), today)[0]).toMatchObject({
      label: "Tetanus, Diphtherie",
      productId: null,
      datePrecision: "year",
    });
  });

  it("wirft bei einem Fehler", () => {
    expect(() => draftToEntries(draftOf([row("a", "")]), today)).toThrow();
  });

  it("wirft bei zu vielen Zeilen", () => {
    const rows = Array.from({ length: MAX_TRANSFER_ENTRIES + 1 }, (_, i) =>
      row(`r${i}`, "05.12.2016"),
    );
    expect(() => draftToEntries(draftOf(rows), today)).toThrow(/Zu viele/);
  });
});

describe("draftSchema", () => {
  const draft = draftOf([row("a", "05.12.2016")]);

  it("nimmt einen Entwurf an", () => {
    expect(draftSchema.safeParse(draft).success).toBe(true);
  });

  it("lehnt einen ohne rows ab", () => {
    const rest: Partial<Draft> = { ...draft };
    delete rest.rows;
    expect(draftSchema.safeParse(rest).success).toBe(false);
  });

  it("lehnt fremde Feldnamen und andere Versionen ab", () => {
    const bad = { ...draft.rows[0], unsure: ["foo"] };
    expect(draftSchema.safeParse({ ...draft, rows: [bad] }).success).toBe(
      false,
    );
    expect(draftSchema.safeParse({ ...draft, version: 2 }).success).toBe(false);
  });
});
