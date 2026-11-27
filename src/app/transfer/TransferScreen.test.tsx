import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AppDataProvider, useAppData } from "@/app/data/AppData";
import { encodeTransfer, toTextLine } from "@/core/formats/transfer";
import type { TransferPayload } from "@/core/model";
import { openRepository } from "@/core/storage/repository";
import { renderWithData, seed, testVaccination } from "@/test/helpers";
import { packParts } from "@/test/transfer";
import { TransferScreen } from "./TransferScreen";

const CREATED_AT = "2026-11-27T10:00:00.000Z";

const payload: TransferPayload = {
  id: "K7Q2M9",
  createdAt: CREATED_AT,
  entries: [
    {
      date: "2020-05-01",
      datePrecision: "month",
      productId: "boostrix-polio",
      label: "Boostrix Polio",
      diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
      batch: "AC52B123AB",
      doctor: "Praxis Dr. Muster, Hamburg",
    },
    {
      date: "2016-12-05",
      datePrecision: "day",
      productId: "fsme-immun",
      label: "FSME-Immun",
      diseases: ["tbe"],
    },
    {
      date: "1975-01-01",
      datePrecision: "year",
      productId: null,
      label: "Pocken",
      diseases: ["smallpox"],
      note: "Schulimpfung",
    },
  ],
};

/** Die ganze Übertragung als eine Zeile, wie Datei und Text vom PC. */
const textOf = (p: TransferPayload) =>
  toTextLine(encodeTransfer(p, Infinity)[0]);

/** Die Übertragung in genau `n` Teilen, wie bei mehreren QR-Codes. */
function partsOf(p: TransferPayload, n: number): string[] {
  const data = encodeTransfer(p, Infinity)[0].split(":").slice(4, -1).join(":");
  const parts = encodeTransfer(p, Math.ceil(data.length / n));
  expect(parts).toHaveLength(n);
  return parts.map(toTextLine);
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByLabelText("Text einfügen"));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: "Einlesen" }));
}

const checkbox = (name: RegExp) =>
  screen.getByRole("checkbox", { name }) as HTMLInputElement;

it("zeigt Überschrift, Anleitung und die Wege Datei und Text", async () => {
  await seed({});
  await renderWithData(<TransferScreen />, "/uebernehmen");
  expect(
    screen.getByRole("heading", { name: "Impfungen übernehmen" }),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Öffne am PC impfpass.github.io/import/, prüf dort deine Impfungen und übertrag sie dann hierher.",
    ),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeTruthy();
  expect(screen.getByTestId("transfer-file").getAttribute("accept")).toBe(
    ".txt,text/plain",
  );
  const text = screen.getByLabelText("Text einfügen");
  expect(text.getAttribute("autocorrect")).toBe("off");
  expect(text.getAttribute("spellcheck")).toBe("false");
});

it("eingefügter Text zeigt die Vorschau, „Übernehmen“ speichert die gewählten Einträge", async () => {
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");

  await paste(user, textOf(payload));

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
  await user.click(checkbox(/Pocken/));
  await user.click(
    screen.getByRole("button", { name: "2 Impfungen übernehmen" }),
  );

  expect(await screen.findByText("2 Impfungen übernommen.")).toBeTruthy();
  expect(data().vaccinations).toHaveLength(2);
  expect(data().vaccinations[0]).toMatchObject({
    personId: "p1",
    date: "2020-05-01",
    datePrecision: "month",
    productId: "boostrix-polio",
    batch: "AC52B123AB",
    doctor: "Praxis Dr. Muster, Hamburg",
    source: "import",
    importId: "K7Q2M9",
  });
  expect(data().vaccinations[1]).toMatchObject({
    productId: "fsme-immun",
    source: "import",
    importId: "K7Q2M9",
  });
  const repo = await openRepository();
  expect(await repo.getVaccinations("p1")).toHaveLength(2);
  expect(screen.getByText("Sicherung speichern?")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Zu den Impfungen" }).getAttribute("href"),
  ).toBe("#/impfungen");
});

it("eine vorhandene Impfung erscheint als „Schon eingetragen“ und ist abgewählt", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");

  await paste(user, textOf(payload));

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 1 schon eingetragen."),
  ).toBeTruthy();
  expect(
    screen.getByText("Schon eingetragen: Boostrix Polio, 04.05.2020."),
  ).toBeTruthy();
  expect(checkbox(/Boostrix Polio/).checked).toBe(false);
  expect(checkbox(/FSME-Immun/).checked).toBe(true);

  await user.click(
    screen.getByRole("button", { name: "2 Impfungen übernehmen" }),
  );

  expect(await screen.findByText("2 Impfungen übernommen.")).toBeTruthy();
  expect(data().vaccinations.map((v) => v.label)).toEqual([
    "Boostrix Polio",
    "FSME-Immun",
    "Pocken",
  ]);
  expect(data().vaccinations.map((v) => v.source)).toEqual([
    "manual",
    "import",
    "import",
  ]);
});

it("eine Datei über „Datei öffnen“ zeigt ebenso die Vorschau", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");

  await user.upload(
    screen.getByTestId("transfer-file"),
    new File([`${textOf(payload)}\n`], "impfpass-uebertragung-2026-11-27.txt", {
      type: "text/plain",
    }),
  );

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
});

it("eine Datei über 1 MB wird nicht gelesen", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const file = new File([`${textOf(payload)}\n`], "gross.txt", {
    type: "text/plain",
  });
  Object.defineProperty(file, "size", { value: 1_000_001 });
  const read = vi.spyOn(file, "text");

  await user.upload(screen.getByTestId("transfer-file"), file);

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Datei ist zu groß für eine Übertragung.",
  );
  expect(read).not.toHaveBeenCalled();
});

it("Teile in beliebiger Reihenfolge zeigen den Fortschritt bis zur Vorschau", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first, second, third] = partsOf(payload, 3);

  await paste(user, third);
  expect(
    await screen.findByText(
      "1 von 3 Teilen gelesen. Es fehlen noch Teil 1 und 2.",
    ),
  ).toBeTruthy();
  expect(
    (screen.getByLabelText("Text einfügen") as HTMLTextAreaElement).value,
  ).toBe("");

  await paste(user, first);
  expect(
    await screen.findByText("2 von 3 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();

  // Derselbe Teil noch einmal ändert nichts.
  await paste(user, first);
  expect(
    await screen.findByText("2 von 3 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();

  await paste(user, second);
  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
});

it("mehrere Teile auf einmal eingefügt, mit fremden Zeilen dazwischen", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const parts = partsOf(payload, 3);

  await paste(
    user,
    ["Hallo,", "", parts[1], parts[0], parts[2], "", "Viele Grüße"].join(
      "\r\n",
    ),
  );

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
});

it("ein Teil einer anderen Übertragung bietet „Neu beginnen“ an", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [a1] = partsOf(payload, 3);
  const [b1] = partsOf({ ...payload, id: "B00002" }, 2);

  await paste(user, a1);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );
  await paste(user, b1);

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Dieser Code gehört zu einer anderen Übertragung.",
  );
  // Der bisherige Stand bleibt, bis man neu beginnt.
  expect(
    screen.getByText("1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3."),
  ).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));

  expect(
    await screen.findByText("1 von 2 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("button", { name: "Neu beginnen" })).toBeNull();
});

it("eine Übertragung mit Version 2 meldet „neuere Version“ und speichert nichts", async () => {
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");
  const [line] = packParts(
    { i: "TEST01", c: CREATED_AT, e: [["2020-05-04", "boostrix-polio"]] },
    { version: 2 },
  );

  await paste(user, line);

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Übertragung stammt aus einer neueren Version von ImpfPass. Schließe ImpfPass ganz und öffne es wieder, dann lädt die neue Version.",
  );
  expect(screen.queryByText(/gefunden/)).toBeNull();
  expect(screen.queryByRole("button", { name: /übernehmen$/ })).toBeNull();
  expect(data().vaccinations).toEqual([]);
});

it("ein unbekannter Impfstoff meldet „neuere Version“ und beginnt von vorn", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [line] = packParts({
    i: "TEST01",
    c: CREATED_AT,
    e: [["2020-05-04", "impfstoff-von-morgen"]],
  });

  await paste(user, line);

  expect((await screen.findByRole("alert")).textContent).toMatch(
    /neueren Version von ImpfPass/,
  );
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
  expect(screen.queryByText(/gefunden/)).toBeNull();
});

it("Text ohne Teilzeile meldet „kein Code von ImpfPass“", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");

  await paste(user, "Hallo, hier sind meine Impfungen.");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Das ist kein Code von ImpfPass.",
  );
  expect(
    (screen.getByLabelText("Text einfügen") as HTMLTextAreaElement).value,
  ).toBe("Hallo, hier sind meine Impfungen.");
});

it("„Abbrechen“ in der Vorschau führt leer zurück zum Sammeln", async () => {
  await seed({});
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");
  const parts = partsOf(payload, 2);
  await paste(user, parts.join("\n"));
  await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen.");

  await user.click(screen.getByRole("button", { name: "Abbrechen" }));

  expect(screen.getByLabelText("Text einfügen")).toBeTruthy();
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
  expect(data().vaccinations).toEqual([]);

  // Danach beginnt eine neue Übertragung von vorn.
  await paste(user, parts[1]);
  expect(
    await screen.findByText("1 von 2 Teilen gelesen. Es fehlt noch Teil 1."),
  ).toBeTruthy();
});

it("scheitert das Übernehmen, bleibt die Vorschau mit einem Hinweis", async () => {
  await seed({});
  window.location.hash = "/uebernehmen";
  const addVaccinations = vi.fn().mockRejectedValue(new Error("kaputt"));
  let status = "";
  function Probe() {
    status = useAppData().status;
    return null;
  }
  render(
    <AppDataProvider
      open={async (events) => ({
        ...(await openRepository(events)),
        addVaccinations,
      })}
    >
      <Router hook={useHashLocation}>
        <TransferScreen />
        <Probe />
      </Router>
    </AppDataProvider>,
  );
  const user = userEvent.setup();
  await waitFor(() => expect(status).toBe("ready"));

  await paste(user, textOf(payload));
  await user.click(
    await screen.findByRole("button", { name: "3 Impfungen übernehmen" }),
  );

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  );
  expect(addVaccinations).toHaveBeenCalledOnce();
  expect(addVaccinations.mock.calls[0][0]).toHaveLength(3);
  expect(
    screen.getByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
  await waitFor(() =>
    expect(
      (
        screen.getByRole("button", {
          name: "3 Impfungen übernehmen",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  );
  expect(screen.queryByText(/übernommen\./)).toBeNull();
});
