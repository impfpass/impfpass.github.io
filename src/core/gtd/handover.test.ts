import { describe, expect, it } from "vitest";
import type { Recommendation } from "@/core/rules/types";
import { rec } from "@/test/gtd";
import {
  applyHandover,
  buildPayload,
  contentHash,
  pendingChanges,
} from "./handover";
import { remindersFor } from "./reminders";

const AT = "2026-11-28T12:00:00.000Z";

function reminders(recs: Recommendation[], leadMonths = 6) {
  return remindersFor({
    personId: "p1",
    recommendations: recs,
    leadMonths,
    seasonDay: "09-01",
  });
}

const booster = (dueDate: string) =>
  rec({
    id: "td",
    status: "protected",
    dueDate,
    reason: { kind: "booster", lastDate: "2020-05-04", intervalYears: 10 },
  });
const zoster = rec({ id: "zoster", status: "soon", dueDate: "2027-06-01" });

describe("pendingChanges", () => {
  it("ohne Stand ist alles neu, nach der Übergabe nichts mehr", () => {
    const current = reminders([booster("2030-05-04"), zoster]);
    const changes = pendingChanges(current, null, "p1");
    expect(changes.upserts).toEqual(current);
    expect(changes.cancels).toEqual([]);
    const state = applyHandover(null, "p1", changes, AT);
    expect(pendingChanges(current, state, "p1")).toEqual({
      upserts: [],
      cancels: [],
    });
  });

  it("anderer Vorlauf: dieselbe ref, geänderter Inhalt", () => {
    const before = reminders([booster("2030-05-04"), zoster]);
    const state = applyHandover(
      null,
      "p1",
      pendingChanges(before, null, "p1"),
      AT,
    );
    const after = reminders([booster("2030-05-04"), zoster], 3);
    const changes = pendingChanges(after, state, "p1");
    expect(changes.upserts).toHaveLength(2);
    expect(changes.upserts.map((r) => r.ref).sort()).toEqual(
      before.map((r) => r.ref).sort(),
    );
    expect(changes.cancels).toEqual([]);
  });

  it("Spec 13: geändertes Datum gibt eine neue ref und zieht die alte zurück", () => {
    const before = reminders([booster("2030-05-04")]);
    const state = applyHandover(
      null,
      "p1",
      pendingChanges(before, null, "p1"),
      AT,
    );
    const after = reminders([booster("2036-05-04")]);
    const changes = pendingChanges(after, state, "p1");
    expect(changes.upserts).toEqual(after);
    expect(after[0].ref).not.toBe(before[0].ref);
    expect(changes.cancels).toEqual([before[0].ref]);
  });

  it("Review Focus 1: vergangene Erinnerungstage gelten nicht als geändert", () => {
    // Übergeben am 28.11.2026 mit Erinnerungstag 01.12.2026; Wochen später
    // ist der Tag vorbei, die Erinnerung bleibt dieselbe.
    const recs = [rec({ id: "zoster", status: "soon", dueDate: "2027-06-01" })];
    const handedOver = reminders(recs);
    expect(handedOver[0].day).toBe("2026-12-01");
    const state = applyHandover(
      null,
      "p1",
      pendingChanges(handedOver, null, "p1"),
      AT,
    );
    const weeksLater = reminders([
      rec({ id: "zoster", status: "due", dueDate: "2027-06-01" }),
    ]);
    expect(pendingChanges(weeksLater, state, "p1")).toEqual({
      upserts: [],
      cancels: [],
    });
  });

  it("der Stand einer anderen Person zählt wie kein Stand", () => {
    const current = reminders([zoster]);
    const other = applyHandover(
      null,
      "p2",
      pendingChanges(current, null, "p1"),
      AT,
    );
    expect(pendingChanges(current, other, "p1").upserts).toEqual(current);
    expect(pendingChanges(current, other, "p1").cancels).toEqual([]);
  });
});

describe("applyHandover", () => {
  it("übernimmt upserts, entfernt cancels und lässt den Rest stehen", () => {
    const first = reminders([booster("2030-05-04"), zoster]);
    const state = applyHandover(
      null,
      "p1",
      pendingChanges(first, null, "p1"),
      AT,
    );
    const later = "2027-01-05T08:00:00.000Z";
    const second = reminders([booster("2036-05-04"), zoster]);
    const next = applyHandover(
      state,
      "p1",
      pendingChanges(second, state, "p1"),
      later,
    );
    expect(next.personId).toBe("p1");
    const zosterRef = second.find((r) => r.title.includes("Gürtelrose"))!.ref;
    const tdRef = second.find((r) => r.title.includes("Tetanus"))!.ref;
    expect(next.handedOver).toEqual(
      expect.arrayContaining([
        { ref: zosterRef, contentHash: expect.any(String), at: AT },
        {
          ref: tdRef,
          contentHash: contentHash(second.find((r) => r.ref === tdRef)!),
          at: later,
        },
      ]),
    );
    expect(next.handedOver).toHaveLength(2);
  });
});

describe("contentHash", () => {
  it("hat 16 Hex-Zeichen und ändert sich mit Tag, Titel, Text und Checkliste", () => {
    const [r] = reminders([zoster]);
    expect(contentHash(r)).toMatch(/^[0-9a-f]{16}$/);
    expect(contentHash({ ...r, day: "2026-12-02" })).not.toBe(contentHash(r));
    expect(contentHash({ ...r, title: "x" })).not.toBe(contentHash(r));
    expect(contentHash({ ...r, description: "x" })).not.toBe(contentHash(r));
    expect(contentHash({ ...r, checklist: [] })).not.toBe(contentHash(r));
  });
});

describe("buildPayload", () => {
  it("zieht sofort und vergangene Tage auf heute vor, cancels kommen zuletzt", () => {
    const [now, past, future] = [
      rec({ id: "polio", status: "due", dose: { number: 1, of: 3 } }),
      rec({ id: "zoster", status: "soon", dueDate: "2027-03-01" }),
      booster("2030-05-04"),
    ];
    const upserts = reminders([now, past, future]);
    const payload = buildPayload(
      { upserts, cancels: ["ip-fedcba9876543210"] },
      "2026-11-28",
      new Date(AT),
    );
    expect(payload).toEqual({
      format: "impfpass-gtd",
      version: 1,
      created: AT,
      items: [
        ...upserts.map((r) => ({
          ref: r.ref,
          op: "upsert",
          title: r.title,
          date: r.day === "2029-11-04" ? "2029-11-04" : "2026-11-28",
          time: null,
          description: r.description,
          checklist: r.checklist,
        })),
        { ref: "ip-fedcba9876543210", op: "cancel" },
      ],
    });
  });
});
