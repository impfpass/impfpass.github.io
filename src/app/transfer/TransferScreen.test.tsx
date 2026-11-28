import { act, render, screen, waitFor } from "@testing-library/react";
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

// Das Scannen braucht eine Kamera; der Ersatz liefert Zeilen auf Knopfdruck.
vi.mock("./Scanner", () => ({
  Scanner: ({
    onCode,
    onFallback,
  }: {
    onCode(text: string): void;
    onFallback(way: "file" | "text"): void;
  }) => (
    <div data-testid="scanner">
      <input
        aria-label="Gescannter Text"
        onKeyDown={(e) => {
          if (e.key === "Enter") onCode(e.currentTarget.value);
        }}
      />
      <button type="button" onClick={() => onFallback("text")}>
        Ersatz: Text
      </button>
    </div>
  ),
}));

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

type User = ReturnType<typeof userEvent.setup>;

async function chooseWay(user: User, name: string) {
  await user.click(screen.getByRole("radio", { name }));
}

async function scan(user: User, line: string) {
  const field = screen.getByLabelText("Gescannter Text");
  await user.clear(field);
  await user.click(field);
  await user.paste(line);
  await user.keyboard("{Enter}");
}

async function paste(user: User, text: string) {
  if (!screen.queryByLabelText("Text einfügen")) {
    await chooseWay(user, "Text einfügen");
  }
  await user.click(screen.getByLabelText("Text einfügen"));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: "Einlesen" }));
}

const checkbox = (name: RegExp) =>
  screen.getByRole("checkbox", { name }) as HTMLInputElement;

it("zeigt Überschrift, Anleitung und als ersten Weg das Scannen", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  expect(
    screen.getByRole("heading", { name: "Impfungen übernehmen" }),
  ).toBeTruthy();
  expect(
    screen.getByText(
      "Öffne am PC impfpass.github.io/import/, prüf dort deine Impfungen und übertrag sie dann hierher.",
    ),
  ).toBeTruthy();
  const ways = screen.getAllByRole("radio").map((r) => r.textContent);
  expect(ways).toEqual(["QR-Code scannen", "Datei öffnen", "Text einfügen"]);
  expect(
    screen
      .getByRole("radio", { name: "QR-Code scannen" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(screen.getByTestId("scanner")).toBeTruthy();
  expect(screen.queryByLabelText("Text einfügen")).toBeNull();
  expect(screen.queryByRole("button", { name: "Datei öffnen" })).toBeNull();

  await chooseWay(user, "Datei öffnen");
  expect(screen.queryByTestId("scanner")).toBeNull();
  expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeTruthy();
  expect(screen.getByTestId("transfer-file").getAttribute("accept")).toBe(
    ".txt,text/plain",
  );

  await chooseWay(user, "Text einfügen");
  const text = screen.getByLabelText("Text einfügen");
  expect(text.getAttribute("autocorrect")).toBe("off");
  expect(text.getAttribute("spellcheck")).toBe("false");
  expect(screen.queryByTestId("transfer-file")).toBeNull();
});

it("gescannte Teile in umgekehrter Reihenfolge führen zur Vorschau", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first, second, third] = partsOf(payload, 3);

  await scan(user, third);
  expect(
    await screen.findByText(
      "1 von 3 Teilen gelesen. Es fehlen noch Teil 1 und 2.",
    ),
  ).toBeTruthy();
  // Der Scanner bleibt unter dem Fortschritt sichtbar.
  expect(screen.getByTestId("scanner")).toBeTruthy();

  await scan(user, second);
  expect(
    await screen.findByText("2 von 3 Teilen gelesen. Es fehlt noch Teil 1."),
  ).toBeTruthy();

  await scan(user, first);
  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
  // Die Vorschau löst den Scanner ab, die Kamera stoppt.
  expect(screen.queryByTestId("scanner")).toBeNull();
});

it("ein gescannter fremder Code zeigt den Fehler über dem Scanner", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");

  await scan(user, "https://example.org");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Das ist kein Code von ImpfPass.",
  );
  expect(screen.getByTestId("scanner")).toBeTruthy();
});

it("„Text einfügen“ und der Ausweg des Scanners lösen den Scanner ab", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");

  await user.click(screen.getByRole("button", { name: "Ersatz: Text" }));
  expect(screen.queryByTestId("scanner")).toBeNull();
  expect(screen.getByLabelText("Text einfügen")).toBeTruthy();

  await chooseWay(user, "QR-Code scannen");
  expect(screen.getByTestId("scanner")).toBeTruthy();
  await chooseWay(user, "Text einfügen");
  expect(screen.queryByTestId("scanner")).toBeNull();
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

it("eine angehakte vorhandene Impfung wird durch die Angaben vom PC ersetzt", async () => {
  await seed({
    vaccinations: [testVaccination({ doctor: "Dr. Mustr", note: "links" })],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");

  await paste(user, textOf(payload));
  await screen.findByText("3 Impfungen gefunden, davon 1 schon eingetragen.");
  await user.click(checkbox(/Boostrix Polio/));
  expect(
    screen.getByText(
      "Ersetzt den vorhandenen Eintrag: Boostrix Polio, 04.05.2020.",
    ),
  ).toBeTruthy();
  await user.click(
    screen.getByRole("button", { name: "3 Impfungen übernehmen" }),
  );

  expect(
    await screen.findByText("3 Impfungen übernommen, davon 1 ersetzt."),
  ).toBeTruthy();
  expect(data().vaccinations).toHaveLength(3);
  const stored = await (await openRepository()).getVaccinations("p1");
  expect(stored).toHaveLength(3);
  // Das Datum vom Handy ist genauer als „05/2020“ vom PC und bleibt.
  expect(stored.find((v) => v.id === "v1")).toMatchObject({
    date: "2020-05-04",
    datePrecision: "day",
    batch: "AC52B123AB",
    doctor: "Praxis Dr. Muster, Hamburg",
    note: "links",
    source: "import",
    importId: "K7Q2M9",
    createdAt: "2026-11-26T10:00:00.000Z",
  });
});

it("wurde die vorhandene Impfung inzwischen gelöscht, kommt der Eintrag neu dazu", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<TransferScreen />, "/uebernehmen");

  await paste(user, textOf(payload));
  await screen.findByText("3 Impfungen gefunden, davon 1 schon eingetragen.");
  await user.click(checkbox(/Boostrix Polio/));
  await act(() => data().actions.deleteVaccination("v1"));
  await user.click(
    screen.getByRole("button", { name: "3 Impfungen übernehmen" }),
  );

  expect(await screen.findByText("3 Impfungen übernommen.")).toBeTruthy();
  const stored = await (await openRepository()).getVaccinations("p1");
  expect(stored).toHaveLength(3);
  expect(stored.some((v) => v.id === "v1")).toBe(false);
});

it("eine Datei über „Datei öffnen“ zeigt ebenso die Vorschau", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");

  await chooseWay(user, "Datei öffnen");
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

  await chooseWay(user, "Datei öffnen");
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

it("eine umgebrochene Textzeile (3 Stücke, CRLF) zeigt die Vorschau", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const line = textOf(payload);

  await paste(
    user,
    [
      "Hallo,",
      line.slice(0, 7),
      line.slice(7, 90),
      line.slice(90),
      "Gruß",
    ].join("\r\n"),
  );

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
});

it("ein umgebrochener einzelner Teil wird gesammelt", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [, second] = partsOf(payload, 3);

  await paste(
    user,
    [second.slice(0, 12), second.slice(12, 40), second.slice(40)].join("\r\n"),
  );

  expect(
    await screen.findByText(
      "1 von 3 Teilen gelesen. Es fehlen noch Teil 1 und 3.",
    ),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
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

  expect(
    screen.queryByRole("button", { name: "Von vorn beginnen" }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));

  expect(
    await screen.findByText("1 von 2 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("button", { name: "Neu beginnen" })).toBeNull();
});

it("„Neu beginnen“ liest auch die folgenden Zeilen des eingefügten Texts", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [a1] = partsOf(payload, 3);
  const [b1, b2] = partsOf(
    { ...payload, id: "B00002", entries: payload.entries.slice(0, 2) },
    2,
  );

  await paste(user, ["Hallo,", a1, b1, b2, "Viele Grüße"].join("\n"));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Dieser Code gehört zu einer anderen Übertragung.",
  );
  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));

  expect(
    await screen.findByText("2 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
  // Der Text ist gelesen und steht danach nicht mehr im Feld.
  await user.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(
    (screen.getByLabelText("Text einfügen") as HTMLTextAreaElement).value,
  ).toBe("");
});

it("„Neu beginnen“ lässt geänderten Text im Feld stehen", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [a1] = partsOf(payload, 3);
  const [b1, b2] = partsOf({ ...payload, id: "B00002" }, 2);
  await paste(user, [a1, b1, b2].join("\n"));
  await screen.findByRole("alert");

  await user.type(screen.getByLabelText("Text einfügen"), " neu");
  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));
  await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen.");
  await user.click(screen.getByRole("button", { name: "Abbrechen" }));

  expect(
    (screen.getByLabelText("Text einfügen") as HTMLTextAreaElement).value,
  ).toBe(`${[a1, b1, b2].join("\n")} neu`);
});

it("„Neu beginnen“ nach gesammelten Teilen liest alle Zeilen ab der ersten unpassenden", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [a1] = partsOf(payload, 3);
  const [b1, b2, b3] = partsOf({ ...payload, id: "B00002" }, 3);
  await scan(user, a1);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await chooseWay(user, "Text einfügen");
  await paste(user, [b3, b1].join("\n"));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Dieser Code gehört zu einer anderen Übertragung.",
  );
  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));

  expect(
    await screen.findByText("2 von 3 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();
  await paste(user, b2);
  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
});

it("Text ohne Teilzeile nach gesammelten Teilen bietet „Von vorn beginnen“", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  await paste(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await paste(user, "Hallo, hier sind meine Impfungen.");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Das ist kein Code von ImpfPass.",
  );
  expect(
    screen.getByText("1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3."),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Von vorn beginnen" }));
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("eine Datei ohne Teilzeile nach gesammelten Teilen bietet „Von vorn beginnen“", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  await scan(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await chooseWay(user, "Datei öffnen");
  await user.upload(
    screen.getByTestId("transfer-file"),
    new File(["Einkaufsliste\nBrot\n"], "notiz.txt", { type: "text/plain" }),
  );

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Das ist kein Code von ImpfPass.",
  );
  await user.click(screen.getByRole("button", { name: "Von vorn beginnen" }));
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
});

it("ein fremder Code nach gesammelten Teilen behält sie und bietet „Von vorn beginnen“", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  await scan(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await scan(user, "https://example.org");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Das ist kein Code von ImpfPass.",
  );
  expect(screen.queryByRole("button", { name: "Neu beginnen" })).toBeNull();
  expect(
    screen.getByText("1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3."),
  ).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Von vorn beginnen" }));

  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Von vorn beginnen" }),
  ).toBeNull();
});

it("eine neuere Version nach gesammelten Teilen bietet nur „Von vorn beginnen“", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  const [newer] = packParts(
    { i: "TEST01", c: CREATED_AT, e: [["2020-05-04", "boostrix-polio"]] },
    { version: 2 },
  );
  await paste(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await paste(user, newer);

  expect((await screen.findByRole("alert")).textContent).toMatch(
    /neueren Version von ImpfPass/,
  );
  expect(screen.queryByRole("button", { name: "Neu beginnen" })).toBeNull();
  expect(
    screen.getByText("1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3."),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Von vorn beginnen" }));
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
});

it("nach gescannten Teilen liest eingefügter Text die ganze Übertragung", async () => {
  // Text und Datei vom PC sind ein einziger Teil 1/1 derselben Übertragung.
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  await paste(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await paste(user, textOf(payload));

  expect(
    await screen.findByText("3 Impfungen gefunden, davon 0 schon eingetragen."),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();

  // Die gesammelten Teile sind danach verworfen.
  await user.click(screen.getByRole("button", { name: "Abbrechen" }));
  expect(screen.queryByText(/Teilen gelesen/)).toBeNull();
});

it("nach gescannten Teilen liest eine Datei die ganze Übertragung", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [, second] = partsOf(payload, 3);
  await paste(user, second);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 1 und 3.",
  );

  await chooseWay(user, "Datei öffnen");
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

it("passt ein Teil nicht zu den gesammelten, führt „Neu beginnen“ heraus", async () => {
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const [first] = partsOf(payload, 3);
  // Dieselbe Übertragung, anders geteilt: gleiche ID, andere Gesamtzahl.
  const [otherSplit] = partsOf(payload, 2);
  await paste(user, first);
  await screen.findByText(
    "1 von 3 Teilen gelesen. Es fehlen noch Teil 2 und 3.",
  );

  await paste(user, otherSplit);

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Übertragung ist beschädigt. Erzeuge sie am PC neu.",
  );
  await user.click(screen.getByRole("button", { name: "Neu beginnen" }));

  expect(
    await screen.findByText("1 von 2 Teilen gelesen. Es fehlt noch Teil 2."),
  ).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
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
    "Die Übertragung stammt aus einer neueren Version von ImpfPass. Schließe ImpfPass ganz, öffne es wieder und warte einen Moment. Kommt die Meldung dann noch einmal, schließe und öffne es ein zweites Mal.",
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

it("ein Datum vor dem Geburtsdatum des Profils ist markiert und abgewählt", async () => {
  // Das Profil aus seed hat den 15.03.1967 als Geburtsdatum.
  await seed({});
  const user = userEvent.setup();
  await renderWithData(<TransferScreen />, "/uebernehmen");
  const early: TransferPayload = {
    ...payload,
    entries: [
      ...payload.entries,
      {
        date: "1967-03-14",
        datePrecision: "day",
        productId: null,
        label: "Pocken",
        diseases: ["smallpox"],
      },
    ],
  };

  await paste(user, textOf(early));

  expect(
    await screen.findByText("Das Datum liegt vor deinem Geburtsdatum."),
  ).toBeTruthy();
  expect(checkbox(/14\.03\.1967 Pocken/).checked).toBe(false);
  expect(checkbox(/1975 Pocken/).checked).toBe(true);
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
