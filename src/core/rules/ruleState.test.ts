import { describe, expect, it } from "vitest";
import type { Recommendation, Rulebook } from "./types";
import type { RuleState } from "../model";
import { compareSnapshots, nextRuleState, snapshotOf } from "./ruleState";

function rec(id: string, over: Partial<Recommendation> = {}): Recommendation {
  return {
    id: id as Recommendation["id"],
    diseases: [],
    status: "due",
    dueDate: "2027-01-01",
    latestDate: null,
    dose: null,
    timing: "normal",
    reason: { kind: "none" },
    source: {
      edition: "",
      date: "2026-01-01",
      section: "",
      page: null,
      url: "",
    },
    ...over,
  };
}

function book(version: string, changes: Rulebook["changes"] = []): Rulebook {
  return { version, edition: "", sources: [], changes, rules: [] };
}

const v1 = book("2026-12-01.1");
const v2 = book("2027-01-15.1", [
  {
    version: "2027-01-15.1",
    ids: ["c"],
    validSince: "2027-01-15",
    text: "Die STIKO empfiehlt …",
  },
]);
const recsV1 = [rec("b"), rec("a")];
const recsV2 = [rec("a"), rec("b"), rec("c")];
const stateV1: RuleState = nextRuleState(null, "p1", recsV1, v1);

const kinds = (s: RuleState) =>
  s.notices.map((n) => [n.kind, n.recommendationId]);

describe("Neu-Erkennung", () => {
  it("erste Auswertung legt den Stand ohne Hinweise an", () => {
    const s = nextRuleState(null, "p1", recsV1, v1);
    expect(s).toMatchObject({ seenVersion: "2026-12-01.1", notices: [] });
    expect(s.snapshot.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("neu zutreffend ergibt „Neu“ mit Text und Datum aus der Änderungsliste", () => {
    const s = nextRuleState(stateV1, "p1", recsV2, v2);
    expect(s.notices).toEqual([
      {
        kind: "new",
        recommendationId: "c",
        text: "Die STIKO empfiehlt …",
        validSince: "2027-01-15",
      },
    ]);
    expect(s.seenVersion).toBe("2027-01-15.1");
  });

  it("anderes Fälligkeitsdatum oder andere Dosis ergibt „Geändert“", () => {
    const withDate = [rec("a", { dueDate: "2027-06-01" }), rec("b")];
    expect(kinds(nextRuleState(stateV1, "p1", withDate, v2))).toEqual([
      ["changed", "a"],
    ]);
    const withDose = [rec("a", { dose: { number: 2, of: 3 } }), rec("b")];
    expect(kinds(nextRuleState(stateV1, "p1", withDose, v2))).toEqual([
      ["changed", "a"],
    ]);
  });

  it("weggefallene Empfehlung ergibt „Entfällt“", () => {
    const s = nextRuleState(stateV1, "p1", [rec("a")], v2);
    expect(kinds(s)).toEqual([["dropped", "b"]]);
  });

  it("ohne Eintrag in der Änderungsliste ist der Text null", () => {
    const s = nextRuleState(stateV1, "p1", recsV2, book("2027-01-15.1"));
    expect(s.notices).toEqual([
      { kind: "new", recommendationId: "c", text: null, validSince: null },
    ]);
  });

  it("nimmt den jüngsten passenden Eintrag und ignoriert bereits gesehene", () => {
    const rb = book("2027-03-01.1", [
      {
        version: "2026-12-01.1",
        ids: ["c"],
        validSince: "2026-12-01",
        text: "alt",
      },
      {
        version: "2027-03-01.1",
        ids: ["c"],
        validSince: "2027-03-01",
        text: "neu",
      },
      {
        version: "2027-01-15.1",
        ids: ["c"],
        validSince: "2027-01-15",
        text: "mittel",
      },
    ]);
    const s = nextRuleState(stateV1, "p1", recsV2, rb);
    expect(s.notices[0]).toMatchObject({
      text: "neu",
      validSince: "2027-03-01",
    });
  });

  it("Saison-Impfung: neues Datum ist keine Änderung", () => {
    const before = nextRuleState(
      null,
      "p1",
      [rec("a", { timing: "season", dueDate: "2026-09-01" })],
      v1,
    );
    const s = nextRuleState(
      before,
      "p1",
      [rec("a", { timing: "season", dueDate: "2027-09-01" })],
      v2,
    );
    expect(s.notices).toEqual([]);
  });

  it("Älterwerden ist kein „Neu“: anderer Status bei gleicher Version", () => {
    const before = nextRuleState(
      null,
      "p1",
      [rec("a", { status: "future" })],
      v1,
    );
    const s = nextRuleState(before, "p1", [rec("a", { status: "due" })], v1);
    expect(s.notices).toEqual([]);
  });

  it("abgelehnte Empfehlungen stehen nicht im Schnappschuss", () => {
    const snap = snapshotOf([
      rec("a", { status: "declined" }),
      rec("b", { status: "not_needed" }),
      rec("c", { status: "not_applicable" }),
      rec("d", { status: "discuss", dose: { number: 2, of: 3 } }),
    ]);
    expect(snap).toEqual([
      { id: "d", dueDate: "2027-01-01", dose: 2, season: false },
    ]);
  });

  it("gleiche Version: Schnappschuss neu, alte Hinweise bleiben", () => {
    const withNotice = nextRuleState(stateV1, "p1", recsV2, v2);
    const s = nextRuleState(
      withNotice,
      "p1",
      [rec("a", { dueDate: "2028-01-01" }), rec("b")],
      v2,
    );
    expect(s.notices).toEqual(withNotice.notices);
    expect(s.seenVersion).toBe("2027-01-15.1");
    expect(s.snapshot.find((e) => e.id === "a")?.dueDate).toBe("2028-01-01");
  });

  it("älteres Regelwerk behält die größere seenVersion", () => {
    const withNotice = nextRuleState(stateV1, "p1", recsV2, v2);
    const s = nextRuleState(withNotice, "p1", recsV1, v1);
    expect(s.seenVersion).toBe("2027-01-15.1");
  });

  it("ein neuerer Hinweis ersetzt den älteren zur selben Empfehlung", () => {
    const first = nextRuleState(stateV1, "p1", recsV2, v2);
    const rb3 = book("2027-03-01.1", [
      {
        version: "2027-03-01.1",
        ids: ["c"],
        validSince: "2027-03-01",
        text: "c neu",
      },
    ]);
    const s = nextRuleState(
      first,
      "p1",
      [rec("a"), rec("b"), rec("c", { dueDate: "2028-01-01" })],
      rb3,
    );
    expect(s.notices).toEqual([
      {
        kind: "changed",
        recommendationId: "c",
        text: "c neu",
        validSince: "2027-03-01",
      },
    ]);
  });
});

describe("compareSnapshots", () => {
  it("liefert neu, geändert und entfallen", () => {
    const e = (id: string, dueDate: string | null = null) => ({
      id,
      dueDate,
      dose: null,
      season: false,
    });
    expect(
      compareSnapshots(
        [e("a"), e("b", "2027-01-01")],
        [e("b", "2027-02-01"), e("c")],
      ),
    ).toEqual([
      { kind: "dropped", id: "a" },
      { kind: "changed", id: "b" },
      { kind: "new", id: "c" },
    ]);
  });
});
