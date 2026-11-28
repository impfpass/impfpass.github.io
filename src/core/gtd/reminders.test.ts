import { describe, expect, it } from "vitest";
import { evaluate } from "@/core/rules/evaluate";
import { RULEBOOK } from "@/core/rules/rulebook";
import type { Recommendation } from "@/core/rules/types";
import { rec } from "@/test/gtd";
import { person } from "@/test/rules";
import { remindersFor, type GtdReminder } from "./reminders";

const CHECKLIST = [
  "Termin beim Arzt ausmachen",
  "Termin als Kalender-Aktion eintragen, Impfpass mitnehmen",
  "Nach der Impfung in ImpfPass eintragen",
];

function run(
  recommendations: Recommendation[],
  options: { personId?: string; leadMonths?: number; seasonDay?: string } = {},
): GtdReminder[] {
  return remindersFor({
    personId: options.personId ?? "p1",
    recommendations,
    leadMonths: options.leadMonths ?? 6,
    seasonDay: options.seasonDay ?? "09-01",
  });
}

const booster = rec({
  id: "td",
  status: "protected",
  dueDate: "2030-05-04",
  reason: { kind: "booster", lastDate: "2020-05-04", intervalYears: 10 },
});

describe("remindersFor", () => {
  it("Spec 9.1: Gürtelrose zum 60. Geburtstag, Erinnerung 6 Monate vorher", () => {
    const recs = evaluate(
      person("1967-03-01"),
      [],
      [],
      "2026-11-28",
      RULEBOOK,
      {
        leadMonths: 6,
        seasonDay: "09-01",
      },
    );
    const reminders = run(recs);
    expect(reminders).toContainEqual(
      expect.objectContaining({
        title: "Impfung gegen Gürtelrose, 1. Dosis: Termin beim Arzt ausmachen",
        day: "2026-09-01",
        description:
          "Fällig ab 01.03.2027 (60. Geburtstag) laut STIKO, Stand Epid Bull 4/2026.",
        checklist: CHECKLIST,
      }),
    );
    const refs = reminders.map((r) => r.ref);
    expect(new Set(refs).size).toBe(refs.length);
    for (const ref of refs) expect(ref).toMatch(/^ip-[0-9a-f]{16}$/);
  });

  it("Auffrischung: Fälligkeit minus Vorlauf, mit anderem Vorlauf dieselbe ref", () => {
    const [six] = run([booster]);
    expect(six).toMatchObject({
      day: "2029-11-04",
      title:
        "Impfung gegen Tetanus und Diphtherie, Auffrischung: Termin beim Arzt ausmachen",
      description: "Fällig ab 04.05.2030 laut STIKO, Stand Epid Bull 4/2026.",
      checklist: CHECKLIST,
    });
    const [three] = run([booster], { leadMonths: 3 });
    expect(three.day).toBe("2030-02-04");
    expect(three.ref).toBe(six.ref);
  });

  it("Folgedosis: 28 Tage vor dem frühesten Termin", () => {
    const [r] = run([
      rec({
        id: "zoster",
        status: "soon",
        timing: "follow_up",
        dose: { number: 2, of: 2 },
        dueDate: "2027-01-10",
        latestDate: "2027-05-10",
        reason: { kind: "series", given: 1, total: 2 },
      }),
    ]);
    expect(r.day).toBe("2026-12-13");
    expect(r.title).toBe(
      "Impfung gegen Gürtelrose, 2. Dosis: Termin beim Arzt ausmachen",
    );
    expect(r.description).toBe(
      "Frühestens ab 10.01.2027, spätestens bis 10.05.2027 laut STIKO, Stand Epid Bull 4/2026.",
    );
  });

  it("ohne Fälligkeitsdatum fällig: sofort", () => {
    const [r] = run([
      rec({ id: "td", status: "due", dose: { number: 1, of: 3 } }),
    ]);
    expect(r.day).toBeNull();
    expect(r.description).toBe(
      "Jetzt fällig laut STIKO, Stand Epid Bull 4/2026.",
    );
  });

  it("Saison: drei Saisons am Saison-Tag", () => {
    const reminders = run([
      rec({
        id: "influenza",
        status: "protected",
        timing: "season",
        dueDate: "2027-09-01",
        reason: { kind: "season", label: "2026/27" },
      }),
    ]);
    expect(reminders.map((r) => [r.day, r.title])).toEqual([
      [
        "2027-09-01",
        "Impfung gegen Grippe, Saison 2027/28: Termin beim Arzt ausmachen",
      ],
      [
        "2028-09-01",
        "Impfung gegen Grippe, Saison 2028/29: Termin beim Arzt ausmachen",
      ],
      [
        "2029-09-01",
        "Impfung gegen Grippe, Saison 2029/30: Termin beim Arzt ausmachen",
      ],
    ]);
    expect(reminders[0].description).toBe(
      "Jährliche Impfung für die Saison 2027/28 laut STIKO, Stand Epid Bull 4/2026.",
    );
  });

  it("Saison: anderer Saison-Tag verschiebt die Tage, die refs bleiben", () => {
    const flu = (dueDate: string) =>
      rec({ id: "influenza", status: "protected", timing: "season", dueDate });
    const september = run([flu("2027-09-01")]);
    const october = run([flu("2027-10-01")], { seasonDay: "10-01" });
    expect(october.map((r) => r.ref)).toEqual(september.map((r) => r.ref));
    expect(october.map((r) => r.day)).toEqual([
      "2027-10-01",
      "2028-10-01",
      "2029-10-01",
    ]);
  });

  it("Saison: späterer frühester Termin, erste Erinnerung 28 Tage davor", () => {
    const covid = run([
      rec({
        id: "covid19",
        status: "soon",
        timing: "season",
        dueDate: "2026-11-15",
        reason: { kind: "season", label: "2026/27" },
      }),
    ]);
    expect(covid.map((r) => r.day)).toEqual([
      "2026-10-18",
      "2027-09-01",
      "2028-09-01",
    ]);
    expect(covid[0].description).toBe(
      "Jährliche Impfung für die Saison 2026/27, frühestens ab 15.11.2026 laut STIKO, Stand Epid Bull 4/2026.",
    );
    expect(covid[1].description).toBe(
      "Jährliche Impfung für die Saison 2027/28 laut STIKO, Stand Epid Bull 4/2026.",
    );

    const flu = run([
      rec({
        id: "influenza",
        status: "future",
        timing: "season",
        dueDate: "2046-01-15",
        reason: { kind: "age", age: 60 },
      }),
    ]);
    expect(flu.map((r) => [r.day, r.title])).toEqual([
      [
        "2045-12-18",
        "Impfung gegen Grippe, Saison 2045/46: Termin beim Arzt ausmachen",
      ],
      [
        "2046-09-01",
        "Impfung gegen Grippe, Saison 2046/47: Termin beim Arzt ausmachen",
      ],
      [
        "2047-09-01",
        "Impfung gegen Grippe, Saison 2047/48: Termin beim Arzt ausmachen",
      ],
    ]);
  });

  it("Saison: Fälligkeit zwischen April und Saison-Tag zählt zur kommenden Saison", () => {
    const [first] = run([
      rec({
        id: "influenza",
        status: "future",
        timing: "season",
        dueDate: "2046-06-10",
        reason: { kind: "age", age: 60 },
      }),
    ]);
    expect(first.day).toBe("2046-09-01");
    expect(first.title).toContain("Saison 2046/47");
  });

  it("ref hängt an Fälligkeit, Dosis und Person, nicht an der Reihenfolge", () => {
    const [base] = run([booster]);
    const [otherDate] = run([{ ...booster, dueDate: "2031-01-01" }]);
    const [otherDose] = run([{ ...booster, dose: { number: 2, of: 3 } }]);
    const [otherPerson] = run([booster], { personId: "p2" });
    expect(otherDate.ref).not.toBe(base.ref);
    expect(otherDose.ref).not.toBe(base.ref);
    expect(otherPerson.ref).not.toBe(base.ref);

    const zoster = rec({ id: "zoster", status: "soon", dueDate: "2027-03-01" });
    expect(run([booster, zoster])).toEqual(run([zoster, booster]));
  });

  it("keine Erinnerung ohne Empfehlung oder ohne nächsten Termin", () => {
    expect(
      run([
        rec({ id: "td", status: "not_applicable", dueDate: "2030-01-01" }),
        rec({ id: "mmr", status: "declined", dueDate: "2030-01-01" }),
        rec({ id: "polio", status: "not_needed", dueDate: "2030-01-01" }),
        rec({ id: "hepatitis_b", status: "protected" }),
        rec({ id: "pneumococcal", status: "future" }),
      ]),
    ).toEqual([]);
  });

  it("offene Arztkarte: die Erinnerung nach Alter geht trotzdem mit", () => {
    const discuss = run([
      rec({
        id: "zoster",
        status: "discuss",
        dueDate: "2027-03-01",
        dose: { number: 1, of: 2 },
        reason: { kind: "discuss", topic: "chronic", normalAge: 60 },
      }),
    ]);
    const [byAge] = run([
      rec({
        id: "zoster",
        status: "future",
        dueDate: "2027-03-01",
        dose: { number: 1, of: 2 },
        reason: { kind: "age", age: 60 },
      }),
    ]);
    expect(discuss).toHaveLength(2);
    expect(discuss).toContainEqual(
      expect.objectContaining({
        ref: byAge.ref,
        day: "2026-09-01",
        description:
          "Fällig ab 01.03.2027 (60. Geburtstag) laut STIKO, Stand Epid Bull 4/2026.",
      }),
    );
  });

  describe("Sammelaktion für offene Arztfragen", () => {
    const zoster = rec({
      id: "zoster",
      status: "discuss",
      dueDate: "2027-03-01",
      dose: { number: 1, of: 2 },
      reason: { kind: "discuss", topic: "chronic", normalAge: 60 },
    });
    const hepatitisB = rec({
      id: "hepatitis_b",
      status: "discuss",
      reason: { kind: "discuss", topic: "chronic", normalAge: null },
    });
    const varicella = rec({
      id: "varicella",
      status: "discuss",
      reason: { kind: "discuss", topic: "serology", normalAge: null },
    });
    const questionsOf = (reminders: GtdReminder[]) =>
      reminders.find(
        (r) => r.title === "Beim nächsten Arztbesuch nach Impfungen fragen",
      );

    it("fasst alle offenen Fragen in einer Aktion für sofort zusammen", () => {
      const questions = questionsOf(run([varicella, zoster, hepatitisB]));
      expect(questions).toEqual({
        ref: expect.stringMatching(/^ip-[0-9a-f]{16}$/),
        day: null,
        title: "Beim nächsten Arztbesuch nach Impfungen fragen",
        description:
          "Die STIKO empfiehlt diese Impfungen bei manchen Erkrankungen früher oder zusätzlich. Ob das für dich gilt, entscheidet deine Ärztin oder dein Arzt.",
        checklist: [
          "Gürtelrose schon jetzt?",
          "Hepatitis B wegen meiner Erkrankung?",
          "Windpocken: Bluttest, ob ich geschützt bin?",
          "Antworten in ImpfPass eintragen",
        ],
      });
    });

    it("bekommt eine neue ref, wenn sich die Fragen ändern (Entscheidung 6)", () => {
      const all = questionsOf(run([zoster, hepatitisB, varicella]));
      const fewer = questionsOf(run([zoster, varicella]));
      const reordered = questionsOf(run([hepatitisB, varicella, zoster]));
      expect(fewer?.ref).not.toBe(all?.ref);
      expect(reordered?.ref).toBe(all?.ref);
    });

    it("fehlt ohne offene Fragen", () => {
      expect(questionsOf(run([booster]))).toBeUndefined();
    });
  });

  it("sortiert sofort zuerst, dann nach Tag", () => {
    const reminders = run([
      booster,
      rec({ id: "zoster", status: "soon", dueDate: "2027-03-01" }),
      rec({ id: "polio", status: "due", dose: { number: 1, of: 3 } }),
    ]);
    expect(reminders.map((r) => r.day)).toEqual([
      null,
      "2026-09-01",
      "2029-11-04",
    ]);
  });
});
