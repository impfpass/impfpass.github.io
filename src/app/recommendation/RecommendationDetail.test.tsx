import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider } from "@/app/data/AppData";
import { DEFAULT_ANSWERS } from "@/core/model";
import { RULEBOOK } from "@/core/rules/rulebook";
import { openRepository } from "@/core/storage/repository";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { RecommendationDetail } from "./RecommendationDetail";

const TODAY = "2026-11-27";
const td = (id: string, date: string) =>
  testVaccination({
    id,
    date,
    productId: null,
    label: "Td",
    diseases: ["tetanus", "diphtheria"],
  });

async function seedTd() {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      td("a", "1980-01-01"),
      td("b", "1981-01-01"),
      td("c", "2014-03-01"),
    ],
  });
}

const open = (id: string) =>
  renderWithData(<RecommendationDetail id={id} />, `/empfehlungen/${id}`, {
    today: TODAY,
  });

it("zeigt Begründung, Fundstelle und Impfungen", async () => {
  await seedTd();
  await open("td");

  expect(
    screen.getByRole("heading", { name: "Tetanus und Diphtherie" }),
  ).toBeTruthy();
  expect(screen.getByText(/überfällig seit 01\.03\.2024/)).toBeTruthy();
  expect(
    screen.getByText(
      "Letzte Impfung am 01.03.2014. Die nächste Auffrischung ist 10 Jahre danach vorgesehen.",
    ),
  ).toBeTruthy();
  const source = RULEBOOK.rules.find((r) => r.id === "td")!.source;
  const link = screen.getByRole("link", { name: new RegExp(source.edition) });
  expect(link.getAttribute("href")).toBe(source.url);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(screen.queryByText(/Gilt seit/)).toBeNull();
  expect(screen.getByRole("link", { name: /Übersicht/ })).toBeTruthy();
  const items = screen.getAllByRole("link", { name: /^Td/ });
  expect(items[0].textContent).toContain("01.03.2014");
});

it("zeigt „Gilt seit“ aus der Änderungsliste", async () => {
  await seedTd();
  RULEBOOK.changes.push({
    version: "x.1",
    ids: ["td"],
    validSince: "2026-01-15",
    text: "Neu.",
  });
  try {
    await open("td");
    expect(screen.getByText("Gilt seit 15.01.2026")).toBeTruthy();
  } finally {
    RULEBOOK.changes.pop();
  }
});

it("„Möchte ich nicht“ blendet aus, „Wieder anzeigen“ holt zurück", async () => {
  await seedTd();
  const user = userEvent.setup();
  const { data } = await open("td");

  await user.click(screen.getByRole("button", { name: "Möchte ich nicht" }));
  await waitFor(() =>
    expect(data().recommendations.find((r) => r.id === "td")!.status).toBe(
      "declined",
    ),
  );
  expect(data().decisions[0].kind).toBe("declined");

  await user.click(
    await screen.findByRole("button", { name: "Wieder anzeigen" }),
  );
  await waitFor(() =>
    expect(data().recommendations.find((r) => r.id === "td")!.status).toBe(
      "overdue",
    ),
  );
  expect(data().decisions).toHaveLength(0);
});

it("„Nicht nötig“ speichert den gewählten Grund", async () => {
  await seedTd();
  const user = userEvent.setup();
  const { data } = await open("td");

  await user.click(screen.getByRole("button", { name: "Nicht nötig" }));
  await user.click(screen.getByLabelText("Immunität per Bluttest belegt"));
  await user.click(screen.getByRole("button", { name: "Speichern" }));

  await waitFor(() => expect(data().decisions).toHaveLength(1));
  expect(data().decisions[0]).toMatchObject({
    recommendationId: "td",
    kind: "not_needed",
    reason: "Immunität per Bluttest belegt",
  });
  expect(
    await screen.findByText("Nicht nötig: Immunität per Bluttest belegt"),
  ).toBeTruthy();
});

it("„Anderer Grund“ verlangt einen Text", async () => {
  await seedTd();
  const user = userEvent.setup();
  const { data } = await open("td");

  await user.click(screen.getByRole("button", { name: "Nicht nötig" }));
  await user.click(screen.getByLabelText("Anderer Grund"));
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  expect(screen.getByText("Bitte gib einen Grund ein.")).toBeTruthy();
  expect(data().decisions).toHaveLength(0);

  await user.type(screen.getByLabelText("Grund"), "  Titer ok  ");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  await waitFor(() => expect(data().decisions).toHaveLength(1));
  expect(data().decisions[0].reason).toBe("Titer ok");
});

it("Arzt-Antwort lässt sich auf „Noch offen“ zurücksetzen", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1990-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
    decisions: [
      {
        personId: "p1",
        recommendationId: "zoster",
        kind: "doctor_recommends",
        at: "2026-11-20T10:00:00.000Z",
      },
    ],
  });
  const user = userEvent.setup();
  const { data } = await open("zoster");

  expect(screen.getByText("Geantwortet am 20.11.2026")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Noch offen" }));
  await waitFor(() => expect(data().decisions).toHaveLength(0));
  expect(data().recommendations.find((r) => r.id === "zoster")!.status).toBe(
    "discuss",
  );
  expect(screen.queryByText(/Geantwortet am/)).toBeNull();
});

it("ohne Schalter nennt die Gürtelrose-Seite die frühere Empfehlung bei Erkrankungen", async () => {
  await seed({ persons: [testPerson({ birthDate: "1990-05-10" })] });
  await open("zoster");
  expect(
    screen.getByText(
      "Bei bestimmten Erkrankungen empfiehlt die STIKO diese Impfung früher.",
    ),
  ).toBeTruthy();
});

it("Pneumokokken nach früherer PPSV23-Dosis: Datum und Begründung nennen den Abstand", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-01-01" })],
    vaccinations: [
      testVaccination({
        id: "pn",
        date: "2022-03-10",
        productId: "pneumovax-23",
        label: "Pneumovax 23",
        diseases: ["pneumococcal"],
      }),
    ],
  });
  await open("pneumococcal");
  expect(screen.getByText("ab 10.03.2028")).toBeTruthy();
  expect(
    screen.getByText(
      "Letzte Impfung am 10.03.2022. Die STIKO empfiehlt die nächste frühestens 6 Jahre danach.",
    ),
  ).toBeTruthy();
});

it("Nachholhinweis rät, frühere Impfungen einzutragen", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [td("a", "2020-01-01")],
  });
  await open("td");
  expect(
    screen.getByText(
      "Eingetragen sind 1 von 3 Impfungen der Grundimmunisierung. Stehen frühere Impfungen in einem anderen Impfpass, trag sie hier ein, auch wenn nur das Jahr bekannt ist. Dann rechnet ImpfPass mit den Auffrischungen weiter.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/wähle „Nicht nötig“/)).toBeNull();
});

it("„Nicht nötig“ sagt, dass auch spätere Auffrischungen entfallen", async () => {
  await seedTd();
  const user = userEvent.setup();
  await open("td");
  const hint =
    "Die Impfung erscheint dann nicht mehr unter den Empfehlungen, auch nicht für spätere Auffrischungen. Mit „Wieder anzeigen“ holst du sie zurück.";
  expect(screen.queryByText(hint)).toBeNull();
  await user.click(screen.getByRole("button", { name: "Nicht nötig" }));
  const group = screen.getByRole("group", {
    name: "Warum ist die Impfung nicht nötig?",
  });
  expect(within(group).getByText(hint)).toBeTruthy();
});

it("MMR nennt die eine fehlende Impfung in der Einzahl", async () => {
  await seed({ persons: [testPerson({ birthDate: "1980-03-01" })] });
  await open("mmr");
  expect(screen.getByText("Eingetragen sind 0 von 1 Impfung.")).toBeTruthy();
});

it("Hepatitis B nennt keine frühere Empfehlung bei Erkrankungen", async () => {
  await seed({ persons: [testPerson({ birthDate: "1990-05-10" })] });
  await open("hepatitis_b");
  expect(
    screen.queryByText(
      "Bei bestimmten Erkrankungen empfiehlt die STIKO diese Impfung früher.",
    ),
  ).toBeNull();
});

it("eine angefangene Hepatitis-B-Serie ohne Beruf erklärt das Nachholen", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1990-05-10" })],
    vaccinations: [
      testVaccination({
        id: "hb",
        date: "2026-10-27",
        productId: "engerix-b",
        label: "Engerix-B",
        diseases: ["hepatitis_b"],
      }),
    ],
  });
  await open("hepatitis_b");
  expect(
    screen.getByText(
      /^Eingetragen sind 1 von 3 Impfungen\..*ohne neu anzufangen\.$/,
    ),
  ).toBeTruthy();
});

it("ohne Statuszeile steht unter der Überschrift kein leerer Absatz", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1990-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
  });
  const { data } = await open("zoster");
  expect(data().recommendations.find((r) => r.id === "zoster")!.status).toBe(
    "discuss",
  );
  const header = screen.getByRole("heading", { level: 1 }).parentElement!;
  for (const p of header.querySelectorAll("p")) {
    expect(p.textContent).not.toBe("");
  }
});

/** Prüft, ob die Knöpfe zum Ausblenden in der Detailansicht stehen. */
function hideButtonsShown() {
  const wantNot = screen.queryByRole("button", { name: "Möchte ich nicht" });
  const notNeeded = screen.queryByRole("button", { name: "Nicht nötig" });
  return wantNot !== null && notNeeded !== null;
}

it("grüner Eintrag (geschützt) zeigt keine Knöpfe zum Ausblenden", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      td("a", "1980-01-01"),
      td("b", "1981-01-01"),
      td("c", "2020-03-01"),
    ],
  });
  const { data } = await open("td");
  expect(data().recommendations.find((r) => r.id === "td")!.status).toBe(
    "protected",
  );
  expect(screen.queryByRole("button", { name: "Möchte ich nicht" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Nicht nötig" })).toBeNull();
  expect(
    screen.queryByRole("heading", { name: "Deine Entscheidung" }),
  ).toBeNull();
});

it("grauer Eintrag (später) zeigt keine Knöpfe zum Ausblenden", async () => {
  await seed({ persons: [testPerson()] });
  const { data } = await open("rsv");
  expect(data().recommendations.find((r) => r.id === "rsv")!.status).toBe(
    "future",
  );
  expect(screen.queryByRole("button", { name: "Möchte ich nicht" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Nicht nötig" })).toBeNull();
});

it("gelber Eintrag (bald fällig) zeigt die Knöpfe zum Ausblenden", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      td("a", "1980-01-01"),
      td("b", "1981-01-01"),
      td("c", "2017-03-01"),
    ],
  });
  const { data } = await open("td");
  expect(data().recommendations.find((r) => r.id === "td")!.status).toBe(
    "soon",
  );
  expect(hideButtonsShown()).toBe(true);
});

it("Karte „Mit dem Arzt besprechen“ zeigt die Knöpfe zum Ausblenden", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1990-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
  });
  await open("zoster");
  expect(hideButtonsShown()).toBe(true);
});

it("ausgeblendeter Eintrag mit Impfschutz zeigt weiter „Wieder anzeigen“", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      td("a", "1980-01-01"),
      td("b", "1981-01-01"),
      td("c", "2020-03-01"),
    ],
    decisions: [
      {
        personId: "p1",
        recommendationId: "td",
        kind: "declined",
        at: "2026-11-20T10:00:00.000Z",
      },
    ],
  });
  await open("td");
  expect(screen.getByRole("button", { name: "Wieder anzeigen" })).toBeTruthy();
});

it("Arzt-Antwort zeigt einen Fehler, auch wenn keine Knöpfe zum Ausblenden da sind", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1990-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
    decisions: [
      {
        personId: "p1",
        recommendationId: "zoster",
        kind: "doctor_not_applicable",
        at: "2026-11-20T10:00:00.000Z",
      },
    ],
  });
  window.location.hash = "/empfehlungen/zoster";
  render(
    <AppDataProvider
      today={TODAY}
      open={async (events) => ({
        ...(await openRepository(events)),
        deleteDecision: () => Promise.reject(new Error("kaputt")),
      })}
    >
      <Router hook={useHashLocation}>
        <RecommendationDetail id="zoster" />
      </Router>
    </AppDataProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Noch offen" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  );
});

it("unbekannte Empfehlung", async () => {
  await seed({});
  await open("xyz");
  expect(screen.getByText("Diese Empfehlung gibt es nicht.")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Übersicht/ })).toBeTruthy();
});
