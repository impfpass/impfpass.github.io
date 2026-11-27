import { render, screen } from "@testing-library/react";
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
  onDraft,
}: {
  initial?: Draft;
  onDone: (message?: string) => void;
  onDraft: (d: Draft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  onDraft(draft);
  return (
    <GuideStep draft={draft} update={(fn) => setDraft(fn)} onDone={onDone} />
  );
}

function setup(initial?: Draft) {
  const onDone = vi.fn();
  let latest = initial ?? emptyDraft(new Date());
  render(
    <Harness initial={initial} onDone={onDone} onDraft={(d) => (latest = d)} />,
  );
  return { onDone, draft: () => latest };
}

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
  await userEvent.click(
    screen.getByRole("button", { name: "Anleitung kopieren" }),
  );
  expect(writeText).toHaveBeenCalledWith(T.pc.prompt);
  expect((await screen.findByRole("status")).textContent).toBe("Kopiert.");
});

it("zeigt den Ersatztext, wenn die Zwischenablage ablehnt", async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("nein")) });
  setup();
  await userEvent.click(
    screen.getByRole("button", { name: "Anleitung kopieren" }),
  );
  expect((await screen.findByRole("status")).textContent).toBe(
    T.pc.guide.copyFailed,
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
