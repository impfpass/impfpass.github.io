import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { emptyDraft, newRow, type Draft } from "@/core/import/draft";
import fixture from "@/test/fixtures/chatbot-answer.txt?raw";
import { T } from "@/texts";
import { GuideStep } from "./GuideStep";

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  });
}

afterEach(() => setClipboard(undefined));

function Harness({
  initial = emptyDraft(new Date()),
  onDone,
  onClear,
  onDraft,
}: {
  initial?: Draft;
  onDone: (message?: string) => void;
  onClear: () => void;
  onDraft: (d: Draft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  onDraft(draft);
  return (
    <GuideStep
      draft={draft}
      update={(fn) => setDraft(fn)}
      onDone={onDone}
      onClear={onClear}
    />
  );
}

function setup(initial?: Draft) {
  const onDone = vi.fn();
  const onClear = vi.fn();
  let latest = initial ?? emptyDraft(new Date());
  render(
    <Harness
      initial={initial}
      onDone={onDone}
      onClear={onClear}
      onDraft={(d) => (latest = d)}
    />,
  );
  return { onDone, onClear, draft: () => latest };
}

const draftWithRows = (n: number, birthDate = "15.03.1967"): Draft => ({
  ...emptyDraft(new Date()),
  birthDate,
  rows: Array.from({ length: n }, (_, i) => newRow(`old${i}`)),
});

async function pasteAndRead() {
  await userEvent.click(screen.getByLabelText(T.pc.guide.answerLabel));
  await userEvent.paste(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
}

const APPEND_TITLE = (n: string) =>
  `Der Entwurf enthält schon ${n}. Sollen die neuen angehängt werden, oder willst du vorher alles löschen?`;

it("zeigt die drei Schritte und den Hinweis zu den Gesundheitsdaten", () => {
  setup();
  for (const s of T.pc.guide.steps) expect(screen.getByText(s)).toBeTruthy();
  expect(screen.getByRole("note").textContent).toBe(T.pc.guide.privacy);
});

it("zeigt die Anleitung schreibgeschützt", () => {
  setup();
  const area = screen.getByLabelText(
    T.pc.guide.promptLabel,
  ) as HTMLTextAreaElement;
  expect(area.readOnly).toBe(true);
  expect(area.value).toBe(T.pc.prompt);
});

it("kopiert die Anleitung in die Zwischenablage", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  setup();
  // Der Bereich für die Meldung ist schon da, bevor Text darin steht.
  const region = screen.getByRole("status");
  expect(region.textContent).toBe("");
  await userEvent.click(
    screen.getByRole("button", { name: "Anleitung kopieren" }),
  );
  expect(writeText).toHaveBeenCalledWith(T.pc.prompt);
  expect(screen.getByRole("status")).toBe(region);
  await waitFor(() => expect(region.textContent).toBe("Kopiert."));
});

it("zeigt den Ersatztext, wenn die Zwischenablage ablehnt", async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("nein")) });
  setup();
  await userEvent.click(
    screen.getByRole("button", { name: "Anleitung kopieren" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe(T.pc.guide.copyFailed),
  );
  const area = screen.getByLabelText(
    T.pc.guide.promptLabel,
  ) as HTMLTextAreaElement;
  expect(area.selectionEnd - area.selectionStart).toBe(T.pc.prompt.length);
});

it("schreibt das Geburtsdatum bei jeder Änderung in den Entwurf", async () => {
  const { draft } = setup();
  const input = screen.getByLabelText(T.pc.guide.birthDate) as HTMLInputElement;
  expect(input.getAttribute("aria-describedby")).toBeTruthy();
  await userEvent.type(input, "03.04.19");
  expect(draft().birthDate).toBe("03.04.19");
  expect(input.value).toBe("03.04.19");
  expect(
    document.getElementById(input.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBe(T.pc.guide.birthDateHelp);
});

it("liest die Antwort ein, hängt zwölf Zeilen an und meldet das", async () => {
  const { onDone, draft } = setup();
  const area = screen.getByLabelText(T.pc.guide.answerLabel);
  await userEvent.click(area);
  await userEvent.paste(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
  expect(draft().rows).toHaveLength(12);
  expect(new Set(draft().rows.map((r) => r.id)).size).toBe(12);
  expect(onDone).toHaveBeenCalledWith(
    "12 Impfungen eingelesen. Prüfe sie in der Tabelle.",
  );
});

it("zeigt bei unlesbarer Antwort den Fehler und behält den Text", async () => {
  const { onDone, draft } = setup();
  const area = screen.getByLabelText(
    T.pc.guide.answerLabel,
  ) as HTMLTextAreaElement;
  await userEvent.type(area, "Das ist keine Liste");
  await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    T.pc.chatbotErrors.noJson,
  );
  expect(area.value).toBe("Das ist keine Liste");
  expect(onDone).not.toHaveBeenCalled();
  expect(draft().rows).toHaveLength(0);
});

it("legt ohne Chatbot eine leere Zeile an, wenn der Entwurf keine hat", async () => {
  const { onDone, draft } = setup();
  await userEvent.click(
    screen.getByRole("button", { name: "Ohne Chatbot weiter" }),
  );
  expect(draft().rows).toHaveLength(1);
  expect(onDone).toHaveBeenCalledWith();
});

it("lässt vorhandene Zeilen ohne Chatbot unverändert", async () => {
  const initial = { ...emptyDraft(new Date()), rows: [newRow("r1")] };
  const { onDone, draft } = setup(initial);
  await userEvent.click(
    screen.getByRole("button", { name: "Ohne Chatbot weiter" }),
  );
  expect(draft().rows).toHaveLength(1);
  expect(onDone).toHaveBeenCalledWith();
});

describe("vorhandener Entwurf", () => {
  it("nennt die Zahl der Impfungen und bietet „Entwurf löschen“ an", async () => {
    const { onClear } = setup(draftWithRows(2));
    expect(
      screen.getByText("Der Entwurf enthält schon 2 Impfungen."),
    ).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Entwurf löschen" }),
    );
    expect(
      screen.getByRole("alertdialog", {
        name: "Entwurf löschen? Die Tabelle mit allen Einträgen wird auf diesem PC gelöscht.",
      }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onClear).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Entwurf löschen" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Löschen" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("sagt „1 Impfung“ in der Einzahl", () => {
    setup(draftWithRows(1));
    expect(
      screen.getByText("Der Entwurf enthält schon 1 Impfung."),
    ).toBeTruthy();
  });

  it("zeigt ohne Zeilen weder Hinweis noch „Entwurf löschen“", () => {
    setup();
    expect(screen.queryByText(/Der Entwurf enthält schon/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Entwurf löschen" }),
    ).toBeNull();
  });

  it("„Einlesen“ fragt nach, „Abbrechen“ lässt alles, wie es ist", async () => {
    const { onDone, draft } = setup(draftWithRows(2));
    await pasteAndRead();
    expect(
      screen.getByRole("alertdialog", { name: APPEND_TITLE("2 Impfungen") }),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(draft().rows).toHaveLength(2);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("„Anhängen“ hängt die neuen Zeilen an", async () => {
    const { onDone, draft } = setup(draftWithRows(1));
    await pasteAndRead();
    expect(
      screen.getByRole("alertdialog", { name: APPEND_TITLE("1 Impfung") }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Anhängen" }));

    expect(draft().rows).toHaveLength(13);
    expect(draft().rows[0].id).toBe("old0");
    expect(draft().birthDate).toBe("15.03.1967");
    expect(onDone).toHaveBeenCalledWith(
      "12 Impfungen eingelesen. Prüfe sie in der Tabelle.",
    );
  });

  it("„Vorher löschen“ beginnt mit leerem Entwurf, auch ohne Geburtsdatum", async () => {
    const { onDone, draft } = setup(draftWithRows(2));
    await pasteAndRead();
    await userEvent.click(
      screen.getByRole("button", { name: "Vorher löschen" }),
    );

    expect(draft().rows).toHaveLength(12);
    expect(draft().rows.some((r) => r.id.startsWith("old"))).toBe(false);
    expect(draft().birthDate).toBe("");
    expect(onDone).toHaveBeenCalledWith(
      "12 Impfungen eingelesen. Prüfe sie in der Tabelle.",
    );
  });

  it("eine unlesbare Antwort zeigt den Fehler, ohne zu fragen", async () => {
    const { draft } = setup(draftWithRows(2));
    await userEvent.type(
      screen.getByLabelText(T.pc.guide.answerLabel),
      "Das ist keine Liste",
    );
    await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      T.pc.chatbotErrors.noJson,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(draft().rows).toHaveLength(2);
  });
});

describe("Fehler bei der Antwort", () => {
  it("verknüpft das Feld mit der Fehlermeldung und löst das wieder", async () => {
    setup();
    const area = screen.getByLabelText(T.pc.guide.answerLabel);
    expect(area.getAttribute("aria-invalid")).toBeNull();
    expect(area.getAttribute("aria-describedby")).toBeNull();

    await userEvent.type(area, "Das ist keine Liste");
    await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
    const alert = await screen.findByRole("alert");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(area.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.id).not.toBe("");

    await userEvent.clear(area);
    await userEvent.click(area);
    await userEvent.paste(fixture);
    await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(area.getAttribute("aria-invalid")).toBeNull();
    expect(area.getAttribute("aria-describedby")).toBeNull();
  });
});
