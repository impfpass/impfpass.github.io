import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createBackup, serializeBackup } from "@/core/formats/backup";
import { DEFAULT_SETTINGS } from "@/core/model";
import { StorageUnavailableError } from "@/core/storage/repository";
import { seed, testPerson, testVaccination } from "@/test/helpers";
import { App } from "./App";

it("zeigt den App-Namen", async () => {
  render(<App />);
  expect(await screen.findByText("ImpfPass")).toBeTruthy();
});

it("ohne Person erscheint die Ersteinrichtung, danach die Übersicht", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(
    await screen.findByRole("heading", { name: "Übersicht" }),
  ).toBeTruthy();
});

it("die Ersteinrichtung bietet das Wiederherstellen einer Sicherung an", async () => {
  const user = userEvent.setup();
  render(<App />);
  const backup = createBackup(
    {
      persons: [testPerson({ name: "Hans" })],
      vaccinations: [testVaccination()],
      decisions: [],
      settings: DEFAULT_SETTINGS,
    },
    new Date("2026-11-20T09:00:00Z"),
  );
  await screen.findByLabelText("Name");
  await user.upload(
    document.querySelector<HTMLInputElement>('input[type="file"]')!,
    new File([serializeBackup(backup)], "sicherung.json"),
  );

  const dialog = await screen.findByRole("alertdialog");
  expect(dialog.textContent).toContain("Diese Sicherung übernehmen?");
  expect(dialog.textContent).not.toContain("gelöscht");
  await user.click(screen.getByRole("button", { name: "Übernehmen" }));

  expect(
    await screen.findByRole("heading", { name: "Übersicht" }),
  ).toBeTruthy();
  expect(screen.getByText("Tetanus")).toBeTruthy();
});

it("„Neue Impfung“ nach dem Speichern öffnet ein leeres Formular", async () => {
  await seed({});
  window.history.replaceState(null, "", "/#/impfungen/neu");
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Impfstoff"), "Boostrix Polio");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  await screen.findByText("Die Impfung ist gespeichert.");

  await user.click(screen.getByRole("link", { name: "Neue Impfung" }));

  expect(screen.queryByText("Die Impfung ist gespeichert.")).toBeNull();
  expect((screen.getByLabelText("Impfstoff") as HTMLInputElement).value).toBe(
    "",
  );
});

it("„Neue Impfung“ während der Eingabe lässt die Eingabe stehen", async () => {
  await seed({});
  window.history.replaceState(null, "", "/#/impfungen/neu");
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Impfstoff"), "Boos");

  await user.click(screen.getByRole("link", { name: "Neue Impfung" }));

  expect((screen.getByLabelText("Impfstoff") as HTMLInputElement).value).toBe(
    "Boos",
  );
});

it("die angelegte Person bleibt nach einem Neustart erhalten", async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Übersicht" });
  unmount();

  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Übersicht" }),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Name")).toBeNull();
});

it("Geburtsdatum in der Zukunft wird abgelehnt", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "2999-01-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(
    await screen.findByText("Das Geburtsdatum liegt in der Zukunft."),
  ).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Übersicht" })).toBeNull();
});

it("bei Fehlern in der Ersteinrichtung springt der Fokus ins erste Feld", async () => {
  const user = userEvent.setup();
  render(<App />);
  const name = await screen.findByLabelText("Name");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(document.activeElement).toBe(name);

  await user.type(name, "Christa");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(document.activeElement).toBe(screen.getByLabelText("Geburtsdatum"));
});

it("Name und Geburtsdatum sind Pflicht", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Weiter" }));
  expect(await screen.findByText("Bitte gib einen Namen ein.")).toBeTruthy();
  expect(screen.getByText("Bitte gib das Geburtsdatum ein.")).toBeTruthy();
});

it("ohne Speicher erscheint eine verständliche Meldung", async () => {
  render(<App open={() => Promise.reject(new StorageUnavailableError())} />);
  expect(
    await screen.findByText(/kann auf diesem Gerät keine Daten speichern/),
  ).toBeTruthy();
});

it("untere Navigation führt zu den Bereichen", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Übersicht" });

  const nav = screen.getByRole("navigation");
  await user.click(
    Array.from(nav.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Einstellungen"),
    )!,
  );
  expect(
    await screen.findByRole("heading", { name: "Einstellungen" }),
  ).toBeTruthy();
  expect(window.location.hash).toBe("#/einstellungen");
});

it("nach dem Speichern führt „Weitere Impfung eintragen“ zu einem leeren Formular", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Übersicht" });

  window.location.hash = "/impfungen/neu";
  await user.type(await screen.findByLabelText("Impfstoff"), "Shingrix");
  await user.click(screen.getByRole("button", { name: "Speichern" }));
  await user.click(
    await screen.findByRole("button", { name: "Weitere Impfung eintragen" }),
  );

  const label = (await screen.findByLabelText("Impfstoff")) as HTMLInputElement;
  expect(label.value).toBe("");

  window.location.hash = "/impfungen";
  expect(await screen.findByText("Shingrix")).toBeTruthy();
});

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

it("auf dem iPhone im Browser empfiehlt die Ersteinrichtung zuerst den Home-Bildschirm", async () => {
  const ua = vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IPHONE_UA);
  render(<App />);
  expect(await screen.findByText(/zuerst zum Home-Bildschirm/)).toBeTruthy();
  expect(
    screen.getByText(/erscheint in der App auf dem Home-Bildschirm nicht/),
  ).toBeTruthy();
  ua.mockRestore();
});

it("am PC zeigt die Ersteinrichtung keinen iPhone-Hinweis", async () => {
  render(<App />);
  await screen.findByLabelText("Name");
  expect(screen.queryByText(/zuerst zum Home-Bildschirm/)).toBeNull();
});
