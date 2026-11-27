import { describe, expect, it } from "vitest";
import { person, run, shot } from "@/test/rules";
import { hepatitisBRule } from "./hepatitisB";

describe("hepatitisBRule", () => {
  it("Hepatitis B: Kontakt mit Blut ergibt Grundimmunisierung (Epid Bull 4/2026, S. 13)", () => {
    const p = person("1985-05-05", { job: { bloodContact: true } });
    expect(
      run(hepatitisBRule, { person: p, today: "2026-11-27" }),
    ).toMatchObject({
      status: "due",
      dueDate: null,
      dose: { number: 1, of: 3 },
      reason: { kind: "indication", indication: "job" },
    });
    // Schema 0-1-6: 2. Dosis frühestens 1 Monat, 3. Dosis frühestens 5 Monate danach.
    const second = (today: string) =>
      run(hepatitisBRule, {
        person: p,
        vaccinations: [shot("2026-10-27", "engerix-b")],
        today,
      });
    expect(second("2026-11-26").status).toBe("soon");
    expect(second("2026-11-27")).toMatchObject({
      status: "due",
      dueDate: "2026-11-27",
      latestDate: null,
      dose: { number: 2, of: 3 },
    });
    const third = run(hepatitisBRule, {
      person: p,
      vaccinations: [
        shot("2026-01-01", "engerix-b"),
        shot("2026-02-01", "engerix-b"),
      ],
      today: "2026-07-01",
    });
    expect(third).toMatchObject({
      status: "due",
      dueDate: "2026-07-01",
      dose: { number: 3, of: 3 },
    });
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: [
          shot("2026-01-01", "engerix-b"),
          shot("2026-02-01", "hbvaxpro"),
          shot("2026-07-01", "twinrix"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      dose: null,
      reason: { kind: "complete" },
    });
    expect(hepatitisBRule.id).toBe("hepatitis_b");
    expect(hepatitisBRule.diseases).toEqual(["hepatitis_b"]);
    expect(hepatitisBRule.discussTopic).toBe("chronic");
    expect(hepatitisBRule.source).toMatchObject({
      page: 13,
      section: "Tab. 2, Hepatitis B, Nr. 3",
    });
  });

  it("Hepatitis B: Arbeit mit Patienten ist ebenfalls eine Indikation (Epid Bull 4/2026, S. 13)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05", { job: { patients: true } }),
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      reason: { kind: "indication", indication: "job" },
    });
  });

  it("Hepatitis B: chronische Erkrankung ergibt Karte, „Trifft nicht zu“ blendet sie aus (Epid Bull 4/2026, S. 13)", () => {
    const p = person("1985-05-05", { chronicIllness: true });
    const card = run(hepatitisBRule, { person: p, today: "2026-11-27" });
    expect(card).toMatchObject({
      status: "discuss",
      dueDate: null,
      dose: null,
      reason: { kind: "discuss", topic: "chronic", normalAge: null },
      source: { page: 13, section: "Tab. 2, Hepatitis B, Nr. 1" },
    });
    expect(hepatitisBRule.discussTargetGroup).toBe(
      "Personen, bei denen wegen einer vorbestehenden oder zu erwartenden Immundefizienz, z. B. eine geplante Immunsuppression, oder wegen einer vorbestehenden Erkrankung ein schwerer Verlauf einer Hepatitis-B-Erkrankung zu erwarten ist",
    );
    expect(
      run(hepatitisBRule, {
        person: p,
        decision: "doctor_not_applicable",
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
    expect(
      run(hepatitisBRule, {
        person: p,
        decision: "doctor_recommends",
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      dose: { number: 1, of: 3 },
      reason: { kind: "indication", indication: "doctor" },
    });
  });

  it("Hepatitis B: ohne Beruf, Erkrankung und Arzt keine Empfehlung (Epid Bull 4/2026, S. 13)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05"),
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
  });

  it("Hepatitis B: Kita allein ist keine Indikation (Epid Bull 4/2026, S. 13)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05", { job: { communityFacility: true } }),
        today: "2026-11-27",
      }).status,
    ).toBe("not_applicable");
  });

  it("Hepatitis B: angefangene Serie ohne Beruf wird fortgesetzt (Epid Bull 4/2026, S. 40)", () => {
    const p = person("1985-05-05");
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: [shot("2026-10-27", "engerix-b")],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "due",
      dueDate: "2026-11-27",
      dose: { number: 2, of: 3 },
      reason: { kind: "started", given: 1, total: 3 },
      source: { page: 40, section: "Kap. 4.5 Impfabstände" },
    });
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: [
          shot("2020-01-01", "engerix-b"),
          shot("2020-02-01", "engerix-b"),
          shot("2020-07-01", "engerix-b"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "protected",
      dueDate: null,
      reason: { kind: "complete" },
    });
  });

  it("Hepatitis B: angefangene Serie geht der Karte bei chronischer Erkrankung vor (Epid Bull 4/2026, S. 40)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05", { chronicIllness: true }),
        vaccinations: [shot("2026-10-27", "engerix-b")],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "due", reason: { kind: "started" } });
  });

  it("Hepatitis B: Schnellschema braucht eine 4. Dosis nach 12 Monaten (Epid Bull 27/2026, S. 66, Tab. 7)", () => {
    const p = person("1985-05-05", { job: { bloodContact: true } });
    const rapid = [
      shot("2026-01-01", "engerix-b"),
      shot("2026-02-01", "engerix-b"),
      shot("2026-03-01", "engerix-b"),
    ];
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: rapid,
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "soon",
      dueDate: "2027-01-01",
      dose: { number: 4, of: 4 },
      reason: { kind: "rapid" },
      source: { page: 66, section: "Kap. 5.7.6 Impfschemata, Tab. 7" },
    });
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: [...rapid, shot("2027-01-05", "engerix-b")],
        today: "2027-02-01",
      }).status,
    ).toBe("protected");
  });

  it("Hepatitis B: chronische Erkrankung mit vollständiger Serie behält die Karte (Epid Bull 4/2026, S. 13)", () => {
    const p = person("1985-05-05", { chronicIllness: true });
    const three = [
      shot("2020-01-01", "engerix-b"),
      shot("2020-02-01", "engerix-b"),
      shot("2020-07-01", "engerix-b"),
    ];
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: three,
        today: "2026-11-27",
      }).status,
    ).toBe("discuss");
    expect(
      run(hepatitisBRule, {
        person: p,
        vaccinations: three,
        decision: "doctor_not_applicable",
        today: "2026-11-27",
      }).status,
    ).toBe("protected");
  });

  it("Hepatitis B: drei Dosen mit nur bekanntem Jahr zählen als vollständige Serie (Epid Bull 4/2026, S. 40)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05"),
        vaccinations: [
          shot("2019-03-01", "engerix-b", "year"),
          shot("2019-04-01", "engerix-b", "year"),
          shot("2019-09-01", "engerix-b", "year"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
  });

  it("Hepatitis B: zwei Dosen Heplisav B mit mindestens 4 Wochen Abstand sind vollständig (Fachinformation Heplisav B, Epid Bull 4/2026, S. 69)", () => {
    const two = [
      shot("2026-01-01", "heplisav-b"),
      shot("2026-02-01", "heplisav-b"),
    ];
    for (const p of [
      person("1985-05-05"),
      person("1985-05-05", { job: { bloodContact: true } }),
    ]) {
      expect(
        run(hepatitisBRule, {
          person: p,
          vaccinations: two,
          today: "2026-11-27",
        }),
      ).toMatchObject({ status: "protected", reason: { kind: "complete" } });
    }
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05"),
        vaccinations: [
          shot("2026-01-01", "heplisav-b"),
          shot("2026-01-15", "heplisav-b"),
        ],
        today: "2026-11-27",
      }).status,
    ).toBe("due");
  });

  it("Hepatitis B: vollständige Serie nennt die Anmerkung zu Auffrischungen (Epid Bull 4/2026, S. 13)", () => {
    expect(
      run(hepatitisBRule, {
        person: person("1985-05-05"),
        vaccinations: [
          shot("2020-01-01", "engerix-b"),
          shot("2020-02-01", "engerix-b"),
          shot("2020-07-01", "engerix-b"),
        ],
        today: "2026-11-27",
      }),
    ).toMatchObject({
      status: "protected",
      source: { page: 13, section: "Tab. 2, Hepatitis B, Anmerkungen" },
    });
  });

  it("Hepatitis B: angefangene Serie läuft auch nach „Trifft nicht zu“ weiter (Epid Bull 4/2026, S. 40)", () => {
    for (const p of [
      person("1985-05-05", { chronicIllness: true }),
      person("1985-05-05"),
    ]) {
      expect(
        run(hepatitisBRule, {
          person: p,
          vaccinations: [shot("2026-10-27", "engerix-b")],
          decision: "doctor_not_applicable",
          today: "2026-11-27",
        }),
      ).toMatchObject({ status: "due", reason: { kind: "started" } });
    }
  });
});
