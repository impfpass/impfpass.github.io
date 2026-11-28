import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyDraft, newRow, withLabel } from "@/core/import/draft";
import { openDraftStore } from "@/core/storage/draftStore";
import fixture from "@/test/fixtures/chatbot-answer.txt?raw";
import { T } from "@/texts";
import { ImportApp } from "./ImportApp";

const current = () => screen.getByRole("listitem", { current: "step" });
/** Text aller Statusbereiche, zusammengefasst; "" wenn alle leer sind. */
const statusText = () =>
  screen
    .getAllByRole("status")
    .map((el) => el.textContent)
    .filter(Boolean)
    .join(" ");
const statusWith = (text: string) =>
  screen.getAllByRole("status").find((el) => el.textContent === text)!;

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

it("der Fuß verweist auf die Lizenztexte der verwendeten Software", async () => {
  render(<ImportApp />);
  const link = await screen.findByRole("link", { name: "Lizenztexte ansehen" });
  expect(link.getAttribute("href")).toBe("/third-party-licenses.txt");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener");
  expect(link.closest("footer")).toBeTruthy();
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
  // Der Bereich für die Warnung ist schon da, bevor der Fehler auftritt.
  const before = screen.getAllByRole("status");
  expect(before.every((el) => el.textContent === "")).toBe(true);
  const note = await screen.findByText(T.pc.notSaved);
  expect(before).toContain(note);
  expect(
    screen.getByRole("heading", { level: 2, name: "Anleitung" }),
  ).toBeTruthy();
});

it("liest eine Antwort ein, zeigt Schritt 2 mit Meldung, die beim Wechsel verschwindet", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  const before = screen.getAllByRole("status");
  await userEvent.click(screen.getByLabelText(T.pc.guide.answerLabel));
  await userEvent.paste(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Einlesen" }));
  expect(
    screen.getByRole("heading", { level: 2, name: "Tabelle prüfen" }),
  ).toBeTruthy();
  // Die Meldung landet in einem Bereich, der schon vor dem Einlesen da war.
  expect(statusText()).toBe(
    "12 Impfungen eingelesen. Prüfe sie in der Tabelle.",
  );
  expect(before).toContain(statusWith(statusText()));
  await userEvent.click(screen.getByRole("button", { name: "1 Anleitung" }));
  await userEvent.click(
    screen.getByRole("button", { name: "2 Tabelle prüfen" }),
  );
  expect(statusText()).toBe("");
});

it("geht ohne Chatbot ohne Meldung zu Schritt 2", async () => {
  render(<ImportApp />);
  await screen.findByText("1 Anleitung");
  await userEvent.click(
    screen.getByRole("button", { name: "Ohne Chatbot weiter" }),
  );
  expect(current().textContent).toBe("2 Tabelle prüfen");
  expect(statusText()).toBe("");
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

it("Entwurf löschen leert den Speicher und zeigt Schritt 1 mit Meldung", async () => {
  const store = await openDraftStore();
  await store.save({
    ...emptyDraft(new Date()),
    rows: [withLabel({ ...newRow("r1"), date: "05.12.2016" }, "Repevax")],
  });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Weiter zum Übertragen" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Entwurf löschen" }),
  );
  await userEvent.click(await screen.findByRole("button", { name: "Löschen" }));

  expect(current().textContent).toBe("1 Anleitung");
  await waitFor(() => expect(statusText()).toBe("Der Entwurf ist gelöscht."));
  expect(await store.load()).toBeNull();
});

it("Entwurf löschen in Schritt 2 leert den Speicher und zeigt Schritt 1 mit Meldung", async () => {
  const store = await openDraftStore();
  await store.save({
    ...emptyDraft(new Date()),
    birthDate: "15.03.1967",
    rows: [newRow("r1"), newRow("r2")],
  });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Entwurf löschen" }),
  );
  await userEvent.click(await screen.findByRole("button", { name: "Löschen" }));

  expect(current().textContent).toBe("1 Anleitung");
  await waitFor(() => expect(statusText()).toBe("Der Entwurf ist gelöscht."));
  expect(
    (screen.getByLabelText(T.pc.guide.birthDate) as HTMLInputElement).value,
  ).toBe("");
  expect(await store.load()).toBeNull();
});

it("Entwurf löschen in Schritt 1 leert den Speicher und meldet es", async () => {
  const store = await openDraftStore();
  await store.save({ ...emptyDraft(new Date()), rows: [newRow("r1")] });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "1 Anleitung" }),
  );
  expect(screen.getByText("Der Entwurf enthält schon 1 Impfung.")).toBeTruthy();
  await userEvent.click(
    screen.getByRole("button", { name: "Entwurf löschen" }),
  );
  await userEvent.click(await screen.findByRole("button", { name: "Löschen" }));

  expect(current().textContent).toBe("1 Anleitung");
  await waitFor(() => expect(statusText()).toBe("Der Entwurf ist gelöscht."));
  expect(screen.queryByText(/Der Entwurf enthält schon/)).toBeNull();
  expect(await store.load()).toBeNull();
});

it("Zurück zur Tabelle führt von Schritt 3 zu Schritt 2", async () => {
  const store = await openDraftStore();
  await store.save({
    ...emptyDraft(new Date()),
    rows: [withLabel({ ...newRow("r1"), date: "05.12.2016" }, "Repevax")],
  });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Weiter zum Übertragen" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Zurück zur Tabelle" }),
  );
  expect(current().textContent).toBe("2 Tabelle prüfen");
});

it("„Trotzdem übertragen“ führt über die Rückfrage zu Schritt 3", async () => {
  const store = await openDraftStore();
  await store.save({
    ...emptyDraft(new Date()),
    rows: [withLabel({ ...newRow("r1"), date: "05.12.2016" }, "Bostrix Polio")],
  });
  render(<ImportApp />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Weiter zum Übertragen" }),
  );
  expect(
    screen.getByRole("alertdialog", {
      name: "1 Zeile hat noch Hinweise. Trotzdem übertragen?",
    }),
  ).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Übertragen" }));
  expect(current().textContent).toBe("3 Übertragen");
  expect(
    screen.getByRole("heading", { level: 2, name: "Übertragen" }),
  ).toBeTruthy();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

it("gibt nur der Tabelle die breite Seite", async () => {
  const store = await openDraftStore();
  await store.save({ ...emptyDraft(new Date()), rows: [newRow("r1")] });
  render(<ImportApp />);
  await screen.findByRole("heading", { level: 2, name: "Tabelle prüfen" });
  const page = screen.getByRole("main").parentElement!;
  expect(page.className).toContain("max-w-[112rem]");
  await userEvent.click(screen.getByRole("button", { name: "1 Anleitung" }));
  expect(page.className).toContain("max-w-7xl");
  expect(page.className).not.toContain("112rem");
});
