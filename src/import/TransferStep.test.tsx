import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { todayISO } from "@/core/dates";
import { readTransferText, transferFileName } from "@/core/formats/transfer";
import {
  draftToEntries,
  emptyDraft,
  newRow,
  withProduct,
  type Draft,
} from "@/core/import/draft";
import { saveFile } from "@/lib/saveFile";
import { T } from "@/texts";
import { TransferStep } from "./TransferStep";

vi.mock("@/lib/saveFile", () => ({
  saveFile: vi.fn().mockResolvedValue("downloaded"),
}));

function draftWith(n: number): Draft {
  const rows = Array.from({ length: n }, (_, i) => ({
    ...withProduct(newRow(`r${i}`), "boostrix-polio"),
    date: "05.12.2016",
    // Schwer zu packen, damit mehrere Codes entstehen.
    batch: (i * 7919 + 104729).toString(36).toUpperCase(),
    doctor: `Praxis ${(i * 15485863).toString(36)} ${(i * 32452843).toString(36)}`,
  }));
  return { ...emptyDraft(new Date()), rows };
}

const noop = () => {};

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  setClipboard(undefined);
  vi.clearAllMocks();
});

it("zeigt Code 1 von N und blättert weiter und zurück", async () => {
  render(
    <TransferStep draft={draftWith(400)} onBack={noop} onCleared={noop} />,
  );
  const label = screen.getByText(/^Code 1 von \d+$/).textContent!;
  const total = Number(label.split(" ").at(-1));
  expect(total).toBeGreaterThan(1);
  expect(
    screen.getByRole("img", { name: `QR-Code 1 von ${total}` }),
  ).toBeTruthy();

  const prev = screen.getByRole("button", { name: "Vorheriger Code" });
  const next = screen.getByRole("button", { name: "Nächster Code" });
  expect((prev as HTMLButtonElement).disabled).toBe(true);

  await userEvent.click(next);
  expect(screen.getByText(`Code 2 von ${total}`)).toBeTruthy();
  expect((prev as HTMLButtonElement).disabled).toBe(false);
  await userEvent.click(prev);
  expect(screen.getByText(`Code 1 von ${total}`)).toBeTruthy();
});

it("blättert mit den Pfeiltasten und sperrt die Knöpfe an den Enden", async () => {
  render(
    <TransferStep draft={draftWith(400)} onBack={noop} onCleared={noop} />,
  );
  const total = Number(
    screen
      .getByText(/^Code 1 von \d+$/)
      .textContent!.split(" ")
      .at(-1),
  );
  await userEvent.keyboard("{ArrowRight}");
  expect(screen.getByText(`Code 2 von ${total}`)).toBeTruthy();
  await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
  expect(screen.getByText(`Code 1 von ${total}`)).toBeTruthy();
  await userEvent.keyboard("{ArrowRight}".repeat(total + 3));
  expect(screen.getByText(`Code ${total} von ${total}`)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Nächster Code" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it("blendet bei einem einzigen Code die Knöpfe aus", () => {
  render(<TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />);
  expect(screen.getByText("Code 1 von 1")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Nächster Code" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Vorheriger Code" })).toBeNull();
});

it("zeigt die Hinweise zu den Codes", () => {
  render(<TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />);
  expect(screen.getByText(T.pc.send.codesHelp)).toBeTruthy();
  expect(screen.getByText(T.pc.send.codesPrivacy)).toBeTruthy();
  expect(screen.getByText(T.pc.send.fileHelp)).toBeTruthy();
});

it("sagt beim Text, wo er hin muss und über wen er geht", () => {
  render(<TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />);
  const section = screen.getByRole("region", { name: "Text" });
  expect(
    within(section).getByText(
      "Füge den Text auf dem Handy in ImpfPass unter „Impfungen übernehmen“ mit „Text einfügen“ ein. Schickst du ihn per E-Mail, Messenger oder über eine Cloud, gehen die Daten dabei über deren Anbieter.",
    ),
  ).toBeTruthy();
});

it("speichert die Datei ohne Teilen-Menü, mit den Einträgen des Entwurfs", async () => {
  const draft = draftWith(3);
  render(<TransferStep draft={draft} onBack={noop} onCleared={noop} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Datei speichern" }),
  );

  expect(saveFile).toHaveBeenCalledTimes(1);
  const [file, options] = vi.mocked(saveFile).mock.calls[0];
  expect(options).toEqual({ preferShare: false });
  expect(file.name).toBe(transferFileName(new Date()));
  const text = await file.text();
  expect(text.endsWith("\n")).toBe(true);
  expect(text.trim().split("\n")).toHaveLength(1);
  expect(text).not.toContain(" ");
  const result = readTransferText(text);
  expect(result).toHaveProperty("payload");
  if ("payload" in result) {
    expect(result.payload.entries).toEqual(draftToEntries(draft, todayISO()));
  }
});

it("kopiert dieselbe Zeile wie die Datei", async () => {
  const draft = draftWith(3);
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  render(<TransferStep draft={draft} onBack={noop} onCleared={noop} />);
  await userEvent.click(screen.getByRole("button", { name: "Text kopieren" }));

  expect(await screen.findByText("Kopiert.")).toBeTruthy();
  const copied: string = writeText.mock.calls[0][0];
  expect(copied).not.toContain(" ");
  const result = readTransferText(copied);
  expect("payload" in result && result.payload.entries).toEqual(
    draftToEntries(draft, todayISO()),
  );
  expect(
    (screen.getByLabelText(T.pc.send.textLabel) as HTMLTextAreaElement).value,
  ).toBe(copied);
});

it("markiert den Text, wenn Kopieren nicht klappt", async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("nein")) });
  render(<TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />);
  await userEvent.click(screen.getByRole("button", { name: "Text kopieren" }));
  expect(await screen.findByText(T.pc.guide.copyFailed)).toBeTruthy();
  expect(document.activeElement).toBe(
    screen.getByLabelText(T.pc.send.textLabel),
  );
});

it("berechnet die Übertragung nur einmal", async () => {
  const { rerender } = render(
    <TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />,
  );
  const before = (
    screen.getByLabelText(T.pc.send.textLabel) as HTMLTextAreaElement
  ).value;
  rerender(
    <TransferStep draft={draftWith(1)} onBack={noop} onCleared={noop} />,
  );
  await userEvent.keyboard("{ArrowRight}");
  expect(
    (screen.getByLabelText(T.pc.send.textLabel) as HTMLTextAreaElement).value,
  ).toBe(before);
});

describe("zu große Entwürfe", () => {
  /** Zeilen mit langen, kaum zu packenden Notizen: zu viel für 99 QR-Codes. */
  function noisyDraft(n: number): Draft {
    // xorshift32: feste Folge, aber ohne Muster, das deflate packen könnte.
    let x = 2463534242;
    const noise = (length: number) =>
      Array.from({ length }, () => {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return ((x >>> 0) % 36).toString(36);
      }).join("");
    const rows = Array.from({ length: n }, (_, i) => ({
      ...withProduct(newRow(`r${i}`), "boostrix-polio"),
      date: "05.12.2016",
      note: noise(400),
    }));
    return { ...emptyDraft(new Date()), rows };
  }

  it("mehr als 2000 Zeilen: Meldung und „Zurück zur Tabelle“ statt Absturz", async () => {
    const onBack = vi.fn();
    render(
      <TransferStep draft={draftWith(2001)} onBack={onBack} onCleared={noop} />,
    );
    expect(
      screen.getByText(
        "Der Entwurf hat zu viele Zeilen für eine Übertragung (höchstens 2000).",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Datei speichern" }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Zurück zur Tabelle" }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("ein Entwurf mit Fehlern zeigt die Meldung der Tabelle statt Absturz", () => {
    const draft = draftWith(1);
    draft.rows[0] = { ...draft.rows[0], date: "" };
    render(<TransferStep draft={draft} onBack={noop} onCleared={noop} />);
    expect(
      screen.getByText("Behebe zuerst die rot markierten Zeilen."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Zurück zur Tabelle" }),
    ).toBeTruthy();
  });

  it("zu viel für QR-Codes: Hinweis dort, Datei und Text gehen weiter", async () => {
    const draft = noisyDraft(300);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<TransferStep draft={draft} onBack={noop} onCleared={noop} />);

    const codes = screen.getByRole("region", { name: "QR-Codes" });
    expect(
      within(codes).getByText(
        "Zu viele Einträge für QR-Codes. Nimm die Datei oder den Text.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByText(/^Code 1 von/)).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: "Datei speichern" }),
    );
    const [file] = vi.mocked(saveFile).mock.calls[0];
    const result = readTransferText(await file.text());
    expect("payload" in result && result.payload.entries).toEqual(
      draftToEntries(draft, todayISO()),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Text kopieren" }),
    );
    expect(writeText.mock.calls[0][0]).toBe((await file.text()).trim());
  });
});

it("Zurück zur Tabelle ruft onBack", async () => {
  const onBack = vi.fn();
  render(
    <TransferStep draft={draftWith(1)} onBack={onBack} onCleared={noop} />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Zurück zur Tabelle" }),
  );
  expect(onBack).toHaveBeenCalledTimes(1);
});

it("Entwurf löschen fragt nach und ruft erst nach Bestätigung onCleared", async () => {
  const onCleared = vi.fn();
  render(
    <TransferStep draft={draftWith(1)} onBack={noop} onCleared={onCleared} />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Entwurf löschen" }),
  );
  expect(
    await screen.findByText(
      "Entwurf löschen? Die Tabelle mit allen Einträgen wird auf diesem PC gelöscht.",
    ),
  ).toBeTruthy();

  await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(onCleared).not.toHaveBeenCalled();

  await userEvent.click(
    screen.getByRole("button", { name: "Entwurf löschen" }),
  );
  await userEvent.click(await screen.findByRole("button", { name: "Löschen" }));
  expect(onCleared).toHaveBeenCalledTimes(1);
});
