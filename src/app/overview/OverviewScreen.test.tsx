import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_ANSWERS } from "@/core/model";
import { RULEBOOK } from "@/core/rules/rulebook";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { OverviewScreen } from "./OverviewScreen";

const TODAY = "2026-11-27";
const td = (id: string, date: string) =>
  testVaccination({
    id,
    date,
    productId: null,
    label: "Td",
    diseases: ["tetanus", "diphtheria"],
  });

it("ordnet nach Dringlichkeit und färbt die Zeilen", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [
      td("a", "1980-01-01"),
      td("b", "1981-01-01"),
      td("c", "2014-03-01"),
      testVaccination({
        id: "gf",
        date: "2015-01-01",
        productId: null,
        label: "Gelbfieber",
        diseases: ["yellow_fever"],
      }),
    ],
  });
  await renderWithData(<OverviewScreen />, "/", { today: TODAY });

  const headings = screen
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent ?? "");
  const lights = ["Jetzt fällig", "Bald fällig", "Geschützt", "Später"];
  const shown = headings.filter((h) => lights.includes(h));
  expect(shown).toEqual(lights.filter((h) => shown.includes(h)));
  expect(shown[0]).toBe("Jetzt fällig");

  const row = screen.getByRole("link", { name: /Tetanus und Diphtherie/ });
  expect(row.getAttribute("data-light")).toBe("red");
  expect(row.textContent).toContain("überfällig seit 03/2024");
  expect(row.getAttribute("href")).toBe("#/empfehlungen/td");

  const others = screen
    .getByRole("heading", { name: "Weitere Impfungen" })
    .closest("section")!;
  expect(within(others).getByText(/Gelbfieber/)).toBeTruthy();
  expect(
    screen.getByText(new RegExp(`STIKO-Stand: ${RULEBOOK.edition}`)),
  ).toBeTruthy();
  expect(
    screen.getByText("ImpfPass ersetzt keine ärztliche Beratung."),
  ).toBeTruthy();
});

it("unter der Altersgrenze nennen Grippe und COVID-19 das Alter, nicht die Saison", async () => {
  await seed({ persons: [testPerson({ birthDate: "1996-03-10" })] });
  await renderWithData(<OverviewScreen />, "/", { today: TODAY });

  const flu = screen.getByRole("link", { name: /Grippe/ });
  expect(flu.getAttribute("data-light")).toBe("grey");
  expect(flu.textContent).toContain("ab 60 Jahren, also ab 03/2056");
  expect(flu.textContent).not.toContain("Saison");
  const covid = screen.getByRole("link", { name: /COVID-19/ });
  expect(covid.textContent).toContain("ab 75 Jahren, also ab 03/2071");
});

it("Karte „Mit dem Arzt besprechen“: „Arzt empfiehlt sie mir“ macht daraus eine rote Zeile", async () => {
  await seed({
    persons: [
      testPerson({
        birthDate: "1976-05-10",
        answers: { ...DEFAULT_ANSWERS, chronicIllness: true },
      }),
    ],
    vaccinations: [td("a", "2024-01-01")],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<OverviewScreen />, "/", {
    today: TODAY,
  });

  expect(
    screen.getByRole("heading", { name: "Mit dem Arzt besprechen" }),
  ).toBeTruthy();
  const card = screen.getByText("Hepatitis B").closest("li")!;
  await user.click(
    within(card).getByRole("button", { name: "Arzt empfiehlt sie mir" }),
  );
  await waitFor(() => expect(data().decisions).toHaveLength(1));
  const target = data().decisions[0];
  expect(target.kind).toBe("doctor_recommends");

  await waitFor(() =>
    expect(
      document
        .querySelector(`a[href="#/empfehlungen/${target.recommendationId}"]`)
        ?.getAttribute("data-light"),
    ).toBe("red"),
  );
});

it("Hinweise erscheinen und verschwinden mit „Verstanden“", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [td("c", "2014-03-01")],
    ruleStates: [
      {
        personId: "p1",
        seenVersion: RULEBOOK.version,
        snapshot: [],
        notices: [
          {
            kind: "new",
            recommendationId: "rsv",
            text: "Neue RSV-Empfehlung.",
            validSince: "2026-10-01",
          },
          {
            kind: "changed",
            recommendationId: "zoster",
            text: null,
            validSince: null,
          },
          {
            kind: "new",
            recommendationId: "pneumococcal",
            text: null,
            validSince: null,
          },
          {
            kind: "dropped",
            recommendationId: "varicella",
            text: "Windpocken fallen weg.",
            validSince: null,
          },
        ],
      },
    ],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<OverviewScreen />, "/", {
    today: TODAY,
  });

  expect(
    screen.getByText("Neu: Neue RSV-Empfehlung. Betrifft dich."),
  ).toBeTruthy();
  expect(screen.getByText("Geändert: Gürtelrose")).toBeTruthy();
  expect(screen.getByText("Neu: Pneumokokken. Betrifft dich.")).toBeTruthy();
  expect(screen.getByText("Entfällt: Windpocken fallen weg.")).toBeTruthy();
  const links = screen.getAllByRole("link", { name: "Ansehen" });
  expect(links).toHaveLength(3);
  expect(links[0].getAttribute("href")).toBe("#/empfehlungen/rsv");

  await user.click(screen.getByRole("button", { name: "Verstanden" }));
  await waitFor(() => expect(data().ruleState?.notices).toEqual([]));
  expect(screen.queryByText(/Neu: Neue RSV/)).toBeNull();
});

const FSME_QUESTION =
  "Du hast FSME-Impfungen eingetragen. Soll ImpfPass an die Auffrischungen erinnern?";
const fsmeShot = testVaccination({
  id: "f",
  date: "2020-01-01",
  productId: null,
  label: "FSME",
  diseases: ["tbe"],
});

it("FSME-Nachfrage: „Nein“ blendet FSME aus", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [fsmeShot],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<OverviewScreen />, "/", {
    today: TODAY,
  });
  expect(screen.getByText(FSME_QUESTION)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Nein" }));
  await waitFor(() =>
    expect(
      data().decisions.find((d) => d.recommendationId === "tbe")?.kind,
    ).toBe("declined"),
  );
  expect(screen.queryByText(FSME_QUESTION)).toBeNull();
  // Ohne Ja-Antwort gibt es keine FSME-Empfehlung; die Impfung bleibt unter „Weitere Impfungen“.
  expect(document.querySelector('a[href="#/empfehlungen/tbe"]')).toBeNull();
  const others = screen
    .getByRole("heading", { name: "Weitere Impfungen" })
    .closest("section")!;
  expect(within(others).getByText(/FSME/)).toBeTruthy();
});

it("FSME-Nachfrage: „Ja, erinnern“ setzt die Antwort", async () => {
  await seed({
    persons: [testPerson({ birthDate: "1960-05-10" })],
    vaccinations: [fsmeShot],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<OverviewScreen />, "/", {
    today: TODAY,
  });
  await user.click(screen.getByRole("button", { name: "Ja, erinnern" }));
  await waitFor(() => expect(data().person?.answers.fsme).toBe("yes"));
  expect(screen.queryByText(FSME_QUESTION)).toBeNull();
});

it("ohne Einträge erklärt ein Hinweis die vielen roten Zeilen", async () => {
  await seed({ persons: [testPerson({ birthDate: "1960-05-10" })] });
  await renderWithData(<OverviewScreen />, "/", { today: TODAY });
  expect(
    screen.getByText(
      "Du hast noch keine Impfungen eingetragen. Bis dahin steht hier fast alles unter „Jetzt fällig“.",
    ),
  ).toBeTruthy();
  expect(screen.getByRole("link", { name: "Impfung eintragen" })).toBeTruthy();
});

it("unter 18 erscheint der Hinweis auf die Altersgrenze", async () => {
  await seed({
    persons: [testPerson({ birthDate: "2010-01-01" })],
    vaccinations: [td("a", "2020-01-01")],
  });
  await renderWithData(<OverviewScreen />, "/", { today: TODAY });
  expect(
    screen.getByText("ImpfPass berechnet Empfehlungen ab 18 Jahren."),
  ).toBeTruthy();
  expect(screen.getByText(/Tetanus/)).toBeTruthy();
  expect(screen.queryByText("Jetzt fällig")).toBeNull();
});
