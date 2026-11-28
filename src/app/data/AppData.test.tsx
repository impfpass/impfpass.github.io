import type { ComponentProps } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { openDB } from "idb";
import { addYears } from "@/core/dates";
import { createBackup } from "@/core/formats/backup";
import {
  DEFAULT_ANSWERS,
  DEFAULT_SETTINGS,
  type RuleState,
} from "@/core/model";
import { evaluate } from "@/core/rules/evaluate";
import { nextRuleState } from "@/core/rules/ruleState";
import type {
  RecommendationId,
  Rule,
  RuleResult,
  Rulebook,
} from "@/core/rules/types";
import { DB_NAME, DB_VERSION } from "@/core/storage/db";
import { openRepository, type DatabaseEvents } from "@/core/storage/repository";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { AppDataProvider, useAppData, type AppData } from "./AppData";

function renderProvider(
  props: Omit<ComponentProps<typeof AppDataProvider>, "children">,
) {
  let latest: AppData | null = null;
  function Probe() {
    latest = useAppData();
    return null;
  }
  render(
    <AppDataProvider {...props}>
      <Probe />
    </AppDataProvider>,
  );
  return () => latest!;
}

it("lädt neu, wenn eine neuere Version die Datenbank öffnen will", async () => {
  const reload = vi.fn();
  const data = renderProvider({ reload });
  await waitFor(() => expect(data().status).toBe("ready"));

  const newer = await openDB(DB_NAME, DB_VERSION + 1);
  newer.close();

  expect(reload).toHaveBeenCalledTimes(1);
});

it("verbindet sich nach einem Abbruch der Datenbank neu", async () => {
  let events: DatabaseEvents | undefined;
  const open = vi.fn((e?: DatabaseEvents) => {
    events = e;
    return openRepository(e);
  });
  const data = renderProvider({ open });
  await waitFor(() => expect(data().status).toBe("ready"));

  act(() => events?.onTerminated?.());

  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(data().status).toBe("ready"));
});

describe("Tagesdatum", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("liest das Datum bei Rückkehr in die App neu", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 27, 23, 30));
    const data = renderProvider({});
    await waitFor(() => expect(data().status).toBe("ready"));
    expect(data().today).toBe("2026-11-27");

    vi.setSystemTime(new Date(2026, 10, 28, 7, 0));
    expect(document.visibilityState).toBe("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(data().today).toBe("2026-11-28");

    vi.setSystemTime(new Date(2026, 10, 29, 7, 0));
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(data().today).toBe("2026-11-29");
  });

  it("der Tag aus den Props hat Vorrang", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 27, 12, 0));
    const data = renderProvider({ today: "2026-01-15" });
    await waitFor(() => expect(data().status).toBe("ready"));
    vi.setSystemTime(new Date(2026, 10, 28, 12, 0));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(data().today).toBe("2026-01-15");
  });
});

// Test-Regelwerk mit festen Regeln, damit die Tests nicht von den
// STIKO-Regeln abhängen.
const TODAY = "2026-11-27";
const OPTIONS = { leadMonths: 6, seasonDay: "09-01" };

const DUE: RuleResult = {
  status: "due",
  dueDate: null,
  latestDate: null,
  dose: null,
  timing: "normal",
  reason: { kind: "none" },
};

function testRule(id: RecommendationId, run: Rule["evaluate"]): Rule {
  return {
    id,
    diseases: [],
    source: {
      edition: "Test",
      date: "2026-01-01",
      section: "Test",
      page: null,
      url: "https://example.org/",
    },
    evaluate: run,
  };
}

/** Ohne Impfung fällig, sonst geschützt bis zehn Jahre nach der letzten. */
const tdRule = testRule("td", ({ vaccinations }) => {
  const last = vaccinations
    .map((v) => v.date)
    .sort()
    .at(-1);
  return last
    ? { ...DUE, status: "protected", dueDate: addYears(last, 10) }
    : DUE;
});
const zosterRule = testRule("zoster", () => DUE);

const V1: Rulebook = {
  version: "2026-01-01.1",
  edition: "Test",
  sources: [],
  changes: [],
  rules: [tdRule],
};
const V2: Rulebook = {
  version: "2026-06-01.1",
  edition: "Test",
  sources: [],
  changes: [
    {
      version: "2026-06-01.1",
      ids: ["zoster"],
      validSince: "2026-06-01",
      text: "Gürtelrose ist neu",
    },
  ],
  rules: [tdRule, zosterRule],
};

/** Regel-Stand, wie ihn die App mit Regelwerk v1 gespeichert hätte. */
const seenWithV1 = () =>
  nextRuleState(
    null,
    "p1",
    evaluate(testPerson(), [], [], TODAY, V1, OPTIONS),
    V1,
  );

const statusOf = (data: AppData, id: string) =>
  data.recommendations.find((r) => r.id === id)?.status;

/** Der Provider zeigt einen Regel-Stand, bevor er gespeichert ist. */
const expectStored = (state: RuleState | null) =>
  waitFor(async () =>
    expect(await (await openRepository()).getRuleState("p1")).toEqual(state),
  );

describe("Empfehlungen und Regel-Stand", () => {
  it("beim ersten Laden entsteht ein Regel-Stand ohne Hinweise", async () => {
    await seed({});
    const { data } = await renderWithData(null, "/", {
      rulebook: V2,
      today: TODAY,
    });

    await waitFor(() => expect(data().ruleState).not.toBeNull());
    expect(data().ruleState).toEqual({
      personId: "p1",
      seenVersion: V2.version,
      snapshot: [
        { id: "td", dueDate: null, dose: null, season: false },
        { id: "zoster", dueDate: null, dose: null, season: false },
      ],
      notices: [],
    });
    await expectStored(data().ruleState);
    expect(data().today).toBe(TODAY);
    expect(data().recommendations.map((r) => [r.id, r.status])).toEqual([
      ["td", "due"],
      ["zoster", "due"],
    ]);
  });

  it("ein neueres Regelwerk ergibt Hinweise, dismissNotices leert sie", async () => {
    await seed({ ruleStates: [seenWithV1()] });
    const first = await renderWithData(null, "/", {
      rulebook: V2,
      today: TODAY,
    });

    await waitFor(() =>
      expect(first.data().ruleState?.notices).toEqual([
        {
          kind: "new",
          recommendationId: "zoster",
          text: "Gürtelrose ist neu",
          validSince: "2026-06-01",
        },
      ]),
    );
    expect(first.data().ruleState?.seenVersion).toBe(V2.version);

    await act(() => first.data().actions.dismissNotices());
    expect(first.data().ruleState?.notices).toEqual([]);
    first.unmount();

    const again = await renderWithData(null, "/", {
      rulebook: V2,
      today: TODAY,
    });
    await waitFor(() => expect(again.data().ruleState).not.toBeNull());
    expect(again.data().ruleState?.notices).toEqual([]);
    await expectStored(again.data().ruleState);
  });

  it("eine Entscheidung ändert die Empfehlung sofort und bleibt gespeichert", async () => {
    await seed({});
    const first = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    expect(statusOf(first.data(), "td")).toBe("due");

    await act(() =>
      first.data().actions.saveDecision({
        recommendationId: "td",
        kind: "declined",
        reason: "Später",
      }),
    );
    expect(statusOf(first.data(), "td")).toBe("declined");
    expect(first.data().decisions).toEqual([
      {
        personId: "p1",
        recommendationId: "td",
        kind: "declined",
        reason: "Später",
        at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    ]);
    first.unmount();

    const again = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    expect(statusOf(again.data(), "td")).toBe("declined");
    expect(again.data().decisions).toHaveLength(1);
  });

  it("deleteDecision hebt die Entscheidung auf", async () => {
    await seed({});
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });

    await act(() =>
      data().actions.saveDecision({
        recommendationId: "td",
        kind: "not_needed",
      }),
    );
    expect(statusOf(data(), "td")).toBe("not_needed");
    expect(data().decisions[0]).not.toHaveProperty("reason");

    await act(() => data().actions.deleteDecision("td"));
    expect(statusOf(data(), "td")).toBe("due");
    expect(data().decisions).toEqual([]);
    expect(await (await openRepository()).getDecisions("p1")).toEqual([]);
  });

  it("nach einer neuen Impfung ist der Schnappschuss erneuert", async () => {
    await seed({});
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    await waitFor(() =>
      expect(data().ruleState?.snapshot).toEqual([
        { id: "td", dueDate: null, dose: null, season: false },
      ]),
    );

    await act(() =>
      data().actions.saveVaccination(testVaccination({ date: "2020-05-04" })),
    );

    await waitFor(() =>
      expect(data().ruleState?.snapshot).toEqual([
        { id: "td", dueDate: "2030-05-04", dose: null, season: false },
      ]),
    );
    expect(data().ruleState?.notices).toEqual([]);
    await expectStored(data().ruleState);
  });

  it("nach dem Wiederherstellen entsteht der Regel-Stand ohne Hinweise neu", async () => {
    await seed({ ruleStates: [seenWithV1()] });
    const { data } = await renderWithData(null, "/", {
      rulebook: V2,
      today: TODAY,
    });
    await waitFor(() => expect(data().ruleState?.notices).toHaveLength(1));

    const backup = createBackup(
      {
        persons: [testPerson()],
        vaccinations: [testVaccination({ date: "2020-05-04" })],
        decisions: [],
        settings: DEFAULT_SETTINGS,
      },
      new Date("2026-11-27T10:00:00.000Z"),
    );
    await act(() => data().actions.restore(backup));

    await waitFor(() =>
      expect(data().ruleState?.snapshot).toEqual([
        { id: "td", dueDate: "2030-05-04", dose: null, season: false },
        { id: "zoster", dueDate: null, dose: null, season: false },
      ]),
    );
    expect(data().ruleState?.notices).toEqual([]);
    await expectStored(data().ruleState);
  });

  it("speichert den Regel-Stand nur, wenn er sich inhaltlich ändert", async () => {
    await seed({});
    const saves: RuleState[] = [];
    const open = async (events?: DatabaseEvents) => {
      const repo = await openRepository(events);
      return {
        ...repo,
        saveRuleState: (s: RuleState) => {
          saves.push(s);
          return repo.saveRuleState(s);
        },
      };
    };
    const data = renderProvider({ open, rulebook: V1, today: TODAY });
    await waitFor(() => expect(data().ruleState).not.toBeNull());
    expect(saves).toHaveLength(1);

    // Neue Auswertung, aber derselbe Stand: nichts zu speichern.
    await act(() =>
      data().actions.saveSettings({ ...data().settings, leadMonths: 3 }),
    );
    expect(saves).toHaveLength(1);

    await act(() =>
      data().actions.saveVaccination(testVaccination({ date: "2020-05-04" })),
    );
    expect(saves).toHaveLength(2);
    expect(data().ruleState).toEqual(saves[1]);
  });

  it("holt ein fehlgeschlagenes Speichern beim nächsten Abgleich nach", async () => {
    await seed({});
    let failNext = true;
    const saves: RuleState[] = [];
    const open = async (events?: DatabaseEvents) => {
      const repo = await openRepository(events);
      return {
        ...repo,
        saveRuleState: async (s: RuleState) => {
          if (failNext) {
            failNext = false;
            throw new Error("Speichern fehlgeschlagen");
          }
          saves.push(s);
          await repo.saveRuleState(s);
        },
      };
    };
    const data = renderProvider({ open, rulebook: V1, today: TODAY });
    await waitFor(() => expect(data().ruleState).not.toBeNull());
    expect(saves).toEqual([]);
    expect(await (await openRepository()).getRuleState("p1")).toBeNull();

    // Der Stand bleibt gleich, ist aber noch nicht gespeichert.
    await act(() =>
      data().actions.saveSettings({ ...data().settings, leadMonths: 3 }),
    );
    expect(saves).toEqual([data().ruleState]);
    await expectStored(data().ruleState);

    // Der Provider arbeitet danach normal weiter.
    await act(() =>
      data().actions.saveVaccination(testVaccination({ date: "2020-05-04" })),
    );
    expect(saves).toHaveLength(2);
    expect(data().ruleState?.snapshot[0].dueDate).toBe("2030-05-04");
    await expectStored(data().ruleState);
  });

  it("createPerson übernimmt die Angaben zur Person", async () => {
    await seed({ persons: [] });
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    const answers = { ...DEFAULT_ANSWERS, chronicIllness: true };

    await act(() =>
      data().actions.createPerson({
        name: "Christa",
        birthDate: "1967-03-15",
        answers,
      }),
    );

    expect(data().person?.answers).toEqual(answers);
    await waitFor(() =>
      expect(data().ruleState?.personId).toBe(data().person?.id),
    );
  });
});

describe("importVaccinations", () => {
  it("ergänzt die Impfungen und berechnet die Empfehlungen neu", async () => {
    await seed({});
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    await waitFor(() => expect(statusOf(data(), "td")).toBe("due"));

    await act(() =>
      data().actions.importVaccinations([
        testVaccination({ id: "i1", date: "2020-05-04", source: "import" }),
        testVaccination({ id: "i2", date: "2021-01-02", source: "import" }),
      ]),
    );

    expect(data().vaccinations.map((v) => v.id)).toEqual(["i1", "i2"]);
    expect(statusOf(data(), "td")).not.toBe("due");
    expect(await (await openRepository()).getVaccinations("p1")).toHaveLength(
      2,
    );
  });

  it("ersetzt Impfungen mit gleicher ID, statt sie zu verdoppeln", async () => {
    await seed({
      vaccinations: [
        testVaccination({ id: "v1", date: "2016-12-05", doctor: "Dr. Mustr" }),
      ],
    });
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    await waitFor(() => expect(data().vaccinations).toHaveLength(1));

    await act(() =>
      data().actions.importVaccinations([
        testVaccination({
          id: "v1",
          date: "2016-12-05",
          doctor: "Praxis Dr. Muster",
          source: "import",
        }),
        testVaccination({ id: "i2", date: "2021-01-02", source: "import" }),
      ]),
    );

    expect(data().vaccinations.map((v) => [v.id, v.doctor])).toEqual([
      ["v1", "Praxis Dr. Muster"],
      ["i2", undefined],
    ]);
    expect(await (await openRepository()).getVaccinations("p1")).toHaveLength(
      2,
    );
  });

  it("ohne Impfungen ändert sich nichts", async () => {
    await seed({ vaccinations: [testVaccination()] });
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    await waitFor(() => expect(data().vaccinations).toHaveLength(1));
    const before = data();

    await act(() => data().actions.importVaccinations([]));

    expect(data().vaccinations).toBe(before.vaccinations);
    expect(data()).toBe(before);
  });

  it("lässt den Stand unverändert, wenn das Speichern scheitert", async () => {
    await seed({});
    const { data } = await renderWithData(null, "/", {
      rulebook: V1,
      today: TODAY,
    });
    await waitFor(() => expect(data().status).toBe("ready"));
    const broken = testVaccination({
      id: "i1",
      note: (() => "x") as unknown as string,
    });

    await expect(
      act(() => data().actions.importVaccinations([broken])),
    ).rejects.toThrow();
    expect(data().vaccinations).toEqual([]);
  });
});
