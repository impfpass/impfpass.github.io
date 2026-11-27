import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyDraft, newRow, withLabel } from "@/core/import/draft";
import { openDraftStore } from "@/core/storage/draftStore";
import fixture from "@/test/fixtures/chatbot-answer.txt?raw";
import { T } from "@/texts";
import { ImportApp } from "./ImportApp";

const current = () => screen.getByRole("listitem", { current: "step" });

it("zeigt Kopf, Schrittleiste und Fuß", async () => {
  render(<ImportApp />);
  expect(
    screen.getByRole("heading", { level: 1, name: "ImpfPass am PC" }),
  ).toBeTruthy();
  expect(await screen.findByText("1 Anleitung")).toBeTruthy();
  expect(screen.getByText("2 Tabelle prüfen")).toBeTruthy();
  expect(screen.getByText("3 Übertragen")).toBeTruthy();
  expect(
    screen.getByText("ImpfPass ersetzt keine ärztliche Beratung."),
  ).toBeTruthy();
  expect(
    screen.getByText("Der Entwurf bleibt in diesem Browser auf diesem PC."),
  ).toBeTruthy();
});

it("beginnt ohne Zeilen bei Schritt 1", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  expect(current().textContent).toBe("1 Anleitung");
  expect(
    screen.getByRole("heading", { level: 2, name: "Anleitung" }),
  ).toBeTruthy();
  expect(screen.queryByText(T.pc.notSaved)).toBeNull();
});

it("beginnt mit gespeicherten Zeilen bei Schritt 2", async () => {
  const store = await openDraftStore();
  await store.save({ ...emptyDraft(new Date()), rows: [newRow("r1")] });
  render(<ImportApp />);
  await screen.findByRole("heading", { level: 2, name: "Tabelle prüfen" });
  expect(current().textContent).toBe("2 Tabelle prüfen");
});

it("wechselt per Klick zwischen Schritt 1 und 2, Schritt 3 ist nicht anklickbar", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  await userEvent.click(
    screen.getByRole("button", { name: "2 Tabelle prüfen" }),
  );
  expect(
    screen.getByRole("heading", { level: 2, name: "Tabelle prüfen" }),
  ).toBeTruthy();
  expect(current().textContent).toBe("2 Tabelle prüfen");
  await userEvent.click(screen.getByRole("button", { name: "1 Anleitung" }));
  expect(
    screen.getByRole("heading", { level: 2, name: "Anleitung" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "3 Übertragen" })).toBeNull();
});

it("warnt, wenn nicht gespeichert werden kann, und arbeitet weiter", async () => {
  render(<ImportApp openStore={() => Promise.reject(new Error("nein"))} />);
  const note = await screen.findByRole("status");
  expect(note.textContent).toBe(T.pc.notSaved);
  expect(
    screen.getByRole("heading", { level: 2, name: "Anleitung" }),
  ).toBeTruthy();
});

it("liest eine Antwort ein, zeigt Schritt 2 mit Meldung, die beim Wechsel verschwindet", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  await userEvent.click(screen.getByLabelText(T.pc.guide.answerLabel));
  await userEvent.paste(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
  expect(
    screen.getByRole("heading", { level: 2, name: "Tabelle prüfen" }),
  ).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe(
    "12 Impfungen eingelesen. Prüfe sie in der Tabelle.",
  );
  await userEvent.click(screen.getByRole("button", { name: "1 Anleitung" }));
  await userEvent.click(
    screen.getByRole("button", { name: "2 Tabelle prüfen" }),
  );
  expect(screen.queryByRole("status")).toBeNull();
});

it("geht ohne Chatbot ohne Meldung zu Schritt 2", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  await userEvent.click(
    screen.getByRole("button", { name: "Ohne Chatbot weiter" }),
  );
  expect(current().textContent).toBe("2 Tabelle prüfen");
  expect(screen.queryByRole("status")).toBeNull();
});

it("bleibt bei Schritt 2, wenn die letzte Zeile gelöscht wird", async () => {
  const store = await openDraftStore();
  await store.save({ ...emptyDraft(new Date()), rows: [newRow("r1")] });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Löschen, Zeile 1" }),
  );
  expect(current().textContent).toBe("2 Tabelle prüfen");
  expect(
    screen.getByText("Die Tabelle ist leer. Füge eine Zeile hinzu."),
  ).toBeTruthy();
});

it("„Weiter zum Übertragen“ führt zu Schritt 3", async () => {
  const store = await openDraftStore();
  await store.save({
    ...emptyDraft(new Date()),
    rows: [withLabel({ ...newRow("r1"), date: "05.12.2016" }, "Repevax")],
  });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Weiter zum Übertragen" }),
  );
  expect(current().textContent).toBe("3 Übertragen");
  expect(
    screen.getByRole("heading", { level: 2, name: "Übertragen" }),
  ).toBeTruthy();
});
