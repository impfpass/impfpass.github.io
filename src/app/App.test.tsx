import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onTestFinished, vi } from "vitest";
import { createBackup, serializeBackup } from "@/core/formats/backup";
import { DEFAULT_SETTINGS } from "@/core/model";
import {
  openRepository,
  StorageUnavailableError,
} from "@/core/storage/repository";
import { seed, testPerson, testVaccination } from "@/test/helpers";
import { App } from "./App";

/** Ersteinrichtung mit Name, Geburtsdatum und Angaben bis zur Wahl in Schritt 3. */
async function setupUntilStart(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await user.click(await screen.findByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Wie möchtest du anfangen?" });
}

it("zeigt den App-Namen", async () => {
  render(<App />);
  expect(await screen.findByText("ImpfPass")).toBeTruthy();
});

it("ohne Person erscheint die Ersteinrichtung, „Einträge selbst eingeben“ legt die Person an und öffnet das Formular", async () => {
  const user = userEvent.setup();
  render(<App />);
  await setupUntilStart(user);
  // Angelegt wird erst mit der Wahl in Schritt 3.
  expect(await (await openRepository()).getPersons()).toEqual([]);

  await user.click(
    screen.getByRole("button", { name: "Einträge selbst eingeben" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Neue Impfung" }),
  ).toBeTruthy();
  expect(window.location.hash).toBe("#/impfungen/neu");
  const [person] = await (await openRepository()).getPersons();
  expect(person).toMatchObject({ name: "Christa", birthDate: "1967-03-01" });
});

it("„Alte Impfungen vom PC übernehmen“ legt die Person an und öffnet „Impfungen übernehmen“", async () => {
  const user = userEvent.setup();
  render(<App />);
  await setupUntilStart(user);
  expect(
    screen.getByText(
      "Am PC kann ein Chatbot die Fotos deines Impfpasses lesen, und du prüfst alles in einer großen Tabelle. Öffne dazu am PC impfpass.github.io/import/. Danach überträgst du die Impfungen mit QR-Codes hierher.",
    ),
  ).toBeTruthy();

  await user.click(
    screen.getByRole("button", { name: "Alte Impfungen vom PC übernehmen" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Impfungen übernehmen" }),
  ).toBeTruthy();
  expect(window.location.hash).toBe("#/uebernehmen");
  const [person] = await (await openRepository()).getPersons();
  expect(person?.name).toBe("Christa");
});

it("„Zurück“ im dritten Schritt führt zu den Angaben und behält sie", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await user.click(
    await screen.findByRole("switch", {
      name: "Ich habe eine chronische Erkrankung",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await screen.findByRole("heading", { name: "Wie möchtest du anfangen?" });

  await user.click(screen.getByRole("button", { name: "Zurück" }));

  expect(
    await screen.findByRole("heading", { name: "Angaben für Empfehlungen" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("switch", { name: "Ich habe eine chronische Erkrankung" })
      .getAttribute("aria-checked"),
  ).toBe("true");
});

it("Ersteinrichtung speichert die Angaben aus dem zweiten Schritt", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  expect(
    await screen.findByRole("heading", { name: "Angaben für Empfehlungen" }),
  ).toBeTruthy();
  await user.click(
    screen.getByRole("switch", { name: "Ich habe eine chronische Erkrankung" }),
  );
  await user.click(screen.getByRole("radio", { name: "Ja" }));
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await user.click(
    await screen.findByRole("button", { name: "Einträge selbst eingeben" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Neue Impfung" }),
  ).toBeTruthy();
  const [person] = await (await openRepository()).getPersons();
  expect(person?.answers.chronicIllness).toBe(true);
  expect(person?.answers.fsme).toBe("yes");
});

it("„Zurück“ im zweiten Schritt behält Name und Geburtsdatum", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(await screen.findByLabelText("Name"), "Christa");
  await user.type(screen.getByLabelText("Geburtsdatum"), "1967-03-01");
  await user.click(screen.getByRole("button", { name: "Weiter" }));
  await user.click(await screen.findByRole("button", { name: "Zurück" }));
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    "Christa",
  );
  expect(
    (screen.getByLabelText("Geburtsdatum") as HTMLInputElement).value,
  ).toBe("1967-03-01");
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
  expect(screen.getByText("Tetanus und Diphtherie")).toBeTruthy();
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
  await setupUntilStart(user);
  await user.click(
    screen.getByRole("button", { name: "Einträge selbst eingeben" }),
  );
  await screen.findByRole("heading", { name: "Neue Impfung" });
  unmount();

  // Die installierte App startet auf der Startseite.
  window.history.replaceState(null, "", "/");
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
  await setupUntilStart(user);
  await user.click(
    screen.getByRole("button", { name: "Einträge selbst eingeben" }),
  );
  await screen.findByRole("heading", { name: "Neue Impfung" });

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
  await setupUntilStart(user);
  await user.click(
    screen.getByRole("button", { name: "Einträge selbst eingeben" }),
  );

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

it("die Lizenzseiten behalten die untere Navigation und führen zurück", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith(".json")
        ? new Response(
            JSON.stringify({
              packages: 1,
              projects: [{ name: "React", licenses: ["MIT"] }],
            }),
          )
        : new Response("MIT License"),
    ),
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  await seed({});
  window.location.hash = "#/einstellungen/info/lizenzen";
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText("React")).toBeTruthy();
  expect(screen.getByRole("navigation")).toBeTruthy();
  await user.click(
    screen.getByRole("link", { name: "Alle Lizenztexte ansehen" }),
  );
  expect(
    await screen.findByRole("heading", { level: 1, name: "Lizenztexte" }),
  ).toBeTruthy();
  expect(await screen.findByText("MIT License")).toBeTruthy();
  expect(screen.getByRole("navigation")).toBeTruthy();
  await user.click(
    screen.getAllByRole("link", { name: "Verwendete Software" })[0],
  );
  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Verwendete Software",
    }),
  ).toBeTruthy();
});
