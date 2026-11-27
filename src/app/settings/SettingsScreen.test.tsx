import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithData, seed, testPerson } from "@/test/helpers";
import { InfoScreen } from "./InfoScreen";
import { SettingsScreen } from "./SettingsScreen";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("Profil ändern speichert Name und Geburtsdatum", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  const name = screen.getByLabelText("Name");
  await user.clear(name);
  await user.type(name, "Christa M.");
  await user.click(screen.getByRole("button", { name: "Profil speichern" }));

  await waitFor(() => expect(data().person?.name).toBe("Christa M."));
  expect(data().person?.birthDate).toBe("1967-03-15");
  expect(await screen.findByText("Gespeichert.")).toBeTruthy();
});

it("Profil: Geburtsdatum in der Zukunft wird abgelehnt", async () => {
  await seed({ persons: [testPerson()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  const birth = screen.getByLabelText("Geburtsdatum");
  await user.clear(birth);
  await user.type(birth, "2999-01-01");
  await user.click(screen.getByRole("button", { name: "Profil speichern" }));

  expect(
    await screen.findByText("Das Geburtsdatum liegt in der Zukunft."),
  ).toBeTruthy();
  expect(data().person?.birthDate).toBe("1967-03-15");
  expect(document.activeElement).toBe(birth);
});

it("Sicherung speichern merkt sich das Datum der letzten Sicherung", async () => {
  await seed({});
  vi.stubGlobal("navigator", {
    canShare: () => true,
    share: vi.fn().mockResolvedValue(undefined),
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  expect(screen.getByText("Noch keine Sicherung gespeichert.")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Sicherung speichern" }));

  await waitFor(() => expect(data().settings.lastBackupAt).toBeDefined());
  expect(
    screen.getByText(/Letzte Sicherung: \d{2}\.\d{2}\.\d{4}/),
  ).toBeTruthy();
});

it("abgebrochene Sicherung ändert das Datum nicht", async () => {
  await seed({});
  vi.stubGlobal("navigator", {
    canShare: () => true,
    share: vi.fn().mockRejectedValue(new DOMException("", "AbortError")),
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  await user.click(screen.getByRole("button", { name: "Sicherung speichern" }));
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "Sicherung speichern",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(data().settings.lastBackupAt).toBeUndefined();
});

it("verlinkt die Info-Seite", async () => {
  await seed({});
  await renderWithData(<SettingsScreen />, "/einstellungen");
  expect(screen.getByRole("link", { name: /Info/ }).getAttribute("href")).toBe(
    "#/einstellungen/info",
  );
});

it("Info nennt Hinweis, Datenschutz und Version", async () => {
  await seed({});
  await renderWithData(<InfoScreen />, "/einstellungen/info");
  expect(
    screen.getByText(/ImpfPass ersetzt keine ärztliche Beratung\./),
  ).toBeTruthy();
  expect(
    screen.getByText(/ImpfPass schickt nichts ins Internet\./),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Die Sicherung enthält deine Impfdaten. Bewahre sie sicher auf.",
    ),
  ).toBeTruthy();
  expect(screen.getByText(/Version \d+\.\d+\.\d+/)).toBeTruthy();
});

it("Vorlauf und Saison-Tag werden sofort gespeichert", async () => {
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  await user.selectOptions(screen.getByLabelText("Vorlauf"), "3");
  await waitFor(() => expect(data().settings.leadMonths).toBe(3));
  await user.selectOptions(screen.getByLabelText("Saison-Tag"), "1. Oktober");
  await waitFor(() => expect(data().settings.seasonDay).toBe("10-01"));
  expect(data().settings.leadMonths).toBe(3);
});

it("geänderte Angaben werden mit „Angaben speichern“ gespeichert", async () => {
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<SettingsScreen />, "/einstellungen");

  await user.click(
    screen.getByRole("switch", { name: "Ich habe eine chronische Erkrankung" }),
  );
  await user.click(screen.getByRole("radio", { name: "Nein" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: "Ich arbeite in einer Kita, Schule oder anderen Gemeinschaftseinrichtung.",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Angaben speichern" }));

  await waitFor(() => expect(data().person?.answers.chronicIllness).toBe(true));
  expect(data().person?.answers.fsme).toBe("no");
  expect(data().person?.answers.job.communityFacility).toBe(true);
});
