import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_ANSWERS } from "@/core/model";
import { RULEBOOK } from "@/core/rules/rulebook";
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

it("unbekannte Empfehlung", async () => {
  await seed({});
  await open("xyz");
  expect(screen.getByText("Diese Empfehlung gibt es nicht.")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Übersicht/ })).toBeTruthy();
});
