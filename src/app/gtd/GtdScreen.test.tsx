import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider, useAppData, type AppData } from "@/app/data/AppData";
import { GTD_TEXT_PREFIX } from "@/core/formats/gtd";
import { DEFAULT_SETTINGS } from "@/core/model";
import { openRepository, type DatabaseEvents } from "@/core/storage/repository";
import { decodeGtdData } from "@/test/gtd";
import { renderWithData, seed } from "@/test/helpers";
import { GtdScreen } from "./GtdScreen";

const TODAY = "2026-11-28";
const ADDRESS = "https://gtd.example/de/impfpass";
const withAddress = { ...DEFAULT_SETTINGS, gtdUrl: ADDRESS };

/** Erst nach userEvent.setup() aufrufen, das ersetzt navigator.clipboard. */
function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  });
}

// jsdom kann nicht in einen neuen Tab navigieren; der Klick soll nur die
// Übergabe auslösen.
const stopNavigation = (e: MouseEvent) => e.preventDefault();

beforeEach(() => window.addEventListener("click", stopNavigation));
afterEach(() => {
  window.removeEventListener("click", stopNavigation);
  setClipboard(undefined);
  vi.restoreAllMocks();
});

const empty = { upserts: [], cancels: [] };

it("der Link trägt alle offenen Erinnerungen im Fragment und übergibt beim Antippen", async () => {
  await seed({ settings: withAddress });
  const user = userEvent.setup();
  const { data } = await renderWithData(<GtdScreen />, "/gtd", {
    today: TODAY,
  });
  const pending = data().gtd.changes.upserts;
  expect(pending.length).toBeGreaterThan(0);
  expect(screen.getByText(/deine GTD-App unter gtd\.example/)).toBeTruthy();

  const link = screen.getByRole("link", { name: "Link öffnen" });
  const href = link.getAttribute("href")!;
  expect(href.startsWith(`${ADDRESS}#impfpass=`)).toBe(true);
  expect(link.getAttribute("target")).toBe("_blank");
  const payload = decodeGtdData(href.split("#impfpass=")[1]);
  expect(payload.items.map((i) => i.ref)).toEqual(pending.map((r) => r.ref));

  await user.click(link);
  await waitFor(() => expect(data().gtd.changes).toEqual(empty));
  expect(
    screen.getByText(
      "Der Link ist geöffnet. Bestätige die Übernahme in deiner GTD-App.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Dein GTD ist auf dem neuesten Stand.")).toBeTruthy();
});

it("Text kopieren übergibt dieselben Daten als Text", async () => {
  await seed({ settings: withAddress });
  const writeText = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  setClipboard({ writeText });
  const { data } = await renderWithData(<GtdScreen />, "/gtd", {
    today: TODAY,
  });
  const pending = data().gtd.changes.upserts;

  await user.click(screen.getByRole("button", { name: "Text kopieren" }));

  await waitFor(() => expect(data().gtd.changes).toEqual(empty));
  const text = writeText.mock.calls[0][0] as string;
  expect(text.startsWith(GTD_TEXT_PREFIX)).toBe(true);
  expect(
    decodeGtdData(text.slice(GTD_TEXT_PREFIX.length)).items.map((i) => i.ref),
  ).toEqual(pending.map((r) => r.ref));
  expect(
    screen.getByText("Kopiert. Füge den Text jetzt in deiner GTD-App ein."),
  ).toBeTruthy();
});

it("Review Focus 2: gesperrte Zwischenablage zeigt den Text zum selbst Kopieren", async () => {
  await seed({ settings: withAddress });
  const user = userEvent.setup();
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("nein")) });
  const { data } = await renderWithData(<GtdScreen />, "/gtd", {
    today: TODAY,
  });
  const before = data().gtd.changes;

  await user.click(screen.getByRole("button", { name: "Text kopieren" }));

  expect(
    await screen.findByText(
      "Kopieren hat nicht geklappt. Markiere den Text und kopiere ihn selbst.",
    ),
  ).toBeTruthy();
  const field = screen.getByRole("textbox") as HTMLTextAreaElement;
  expect(field.value.startsWith(GTD_TEXT_PREFIX)).toBe(true);
  expect(field.readOnly).toBe(true);
  expect(data().gtd.changes).toBe(before);

  await user.click(
    screen.getByRole("button", { name: "Ich habe den Text kopiert" }),
  );
  await waitFor(() => expect(data().gtd.changes).toEqual(empty));
});

it("Review Focus 4: scheitert das Speichern, sagt die App es und alles bleibt offen", async () => {
  await seed({ settings: withAddress });
  const open = async (events?: DatabaseEvents) => ({
    ...(await openRepository(events)),
    saveGtdState: () => Promise.reject(new Error("Speichern fehlgeschlagen")),
  });
  let latest: AppData | null = null;
  function Probe() {
    latest = useAppData();
    return null;
  }
  window.location.hash = "/gtd";
  render(
    <AppDataProvider open={open} today={TODAY}>
      <Router hook={useHashLocation}>
        <GtdScreen />
        <Probe />
      </Router>
    </AppDataProvider>,
  );
  await waitFor(() => expect(latest!.status).toBe("ready"));
  const before = latest!.gtd.changes;
  const user = userEvent.setup();
  setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });

  await user.click(screen.getByRole("button", { name: "Text kopieren" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  );
  expect(latest!.gtd.changes).toBe(before);
});

it("nennt zurückzuziehende Erinnerungen", async () => {
  await seed({
    settings: withAddress,
    gtdStates: [
      {
        personId: "p1",
        handedOver: [
          {
            ref: "ip-0000000000000000",
            contentHash: "0000000000000000",
            at: "2026-11-01T10:00:00.000Z",
          },
        ],
      },
    ],
  });
  await renderWithData(<GtdScreen />, "/gtd", { today: TODAY });
  expect(
    screen.getByText("1 Erinnerung entfällt und wird im GTD zurückgezogen."),
  ).toBeTruthy();
});

it("ohne Adresse verweist die Seite auf die Einstellungen", async () => {
  await seed({});
  await renderWithData(<GtdScreen />, "/gtd", { today: TODAY });
  expect(
    screen.getByText(
      "Trag in den Einstellungen die Adresse deiner GTD-App ein, dann kannst du Erinnerungen übergeben.",
    ),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Zu den Einstellungen" })
      .getAttribute("href"),
  ).toBe("#/einstellungen");
  expect(screen.queryByRole("button", { name: "Text kopieren" })).toBeNull();
});
