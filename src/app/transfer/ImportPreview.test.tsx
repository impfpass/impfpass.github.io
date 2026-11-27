import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImportItem } from "@/core/import/merge";
import { testVaccination } from "@/test/helpers";
import { ImportPreview } from "./ImportPreview";

const boostrix: ImportItem = {
  entry: {
    date: "2020-05-01",
    datePrecision: "month",
    productId: "boostrix-polio",
    label: "Boostrix Polio",
    diseases: ["tetanus", "diphtheria", "pertussis", "polio"],
  },
  duplicateOf: testVaccination({ label: "Boostrix Polio", date: "2020-05-04" }),
  dateIssue: null,
};
const fsme: ImportItem = {
  entry: {
    date: "2016-12-05",
    datePrecision: "day",
    productId: "fsme-immun",
    label: "FSME-Immun",
    diseases: ["tbe"],
  },
  duplicateOf: null,
  dateIssue: null,
};
const pocken: ImportItem = {
  entry: {
    date: "1975-01-01",
    datePrecision: "year",
    productId: null,
    label: "Pocken",
    diseases: ["smallpox"],
  },
  duplicateOf: null,
  dateIssue: null,
};

const checkbox = (name: RegExp) =>
  screen.getByRole("checkbox", { name }) as HTMLInputElement;
const importButton = () =>
  screen.getByRole("button", { name: /übernehmen$/ }) as HTMLButtonElement;

it("zeigt Anzahl, Datum, Bezeichnung und Krankheiten; Dubletten sind abgewählt", () => {
  render(
    <ImportPreview
      items={[boostrix, fsme, pocken]}
      onImport={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  expect(
    screen.getByText("3 Impfungen gefunden, davon 1 schon eingetragen."),
  ).toBeTruthy();
  expect(checkbox(/05\/2020 Boostrix Polio/).checked).toBe(false);
  expect(
    screen.getByText("Schon eingetragen: Boostrix Polio, 04.05.2020."),
  ).toBeTruthy();
  expect(checkbox(/05\.12\.2016 FSME-Immun/).checked).toBe(true);
  expect(screen.getByText("FSME")).toBeTruthy();
  expect(checkbox(/1975 Pocken/).checked).toBe(true);
  expect(importButton().textContent).toBe("2 Impfungen übernehmen");
});

it("übergibt die gewählten Einträge in der Reihenfolge der Übertragung", async () => {
  const onImport = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <ImportPreview
      items={[boostrix, fsme, pocken]}
      onImport={onImport}
      onCancel={vi.fn()}
    />,
  );

  await user.click(checkbox(/Boostrix Polio/));
  await user.click(checkbox(/FSME-Immun/));
  expect(importButton().textContent).toBe("2 Impfungen übernehmen");
  await user.click(importButton());

  expect(onImport).toHaveBeenCalledWith([boostrix, pocken]);
});

it("ohne gewählten Eintrag ist der Knopf gesperrt", async () => {
  const user = userEvent.setup();
  render(
    <ImportPreview items={[fsme]} onImport={vi.fn()} onCancel={vi.fn()} />,
  );
  expect(importButton().textContent).toBe("1 Impfung übernehmen");

  await user.click(checkbox(/FSME-Immun/));

  expect(importButton().textContent).toBe("0 Impfungen übernehmen");
  expect(importButton().disabled).toBe(true);
});

it("scheitert das Speichern, erscheint ein Hinweis und die Vorschau bleibt", async () => {
  const onImport = vi.fn().mockRejectedValue(new Error("kaputt"));
  const user = userEvent.setup();
  render(
    <ImportPreview
      items={[boostrix, fsme]}
      onImport={onImport}
      onCancel={vi.fn()}
    />,
  );

  await user.click(importButton());

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  );
  await waitFor(() => expect(importButton().disabled).toBe(false));
  expect(checkbox(/FSME-Immun/).checked).toBe(true);
});

it("„Abbrechen“ meldet sich beim Aufrufer", async () => {
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <ImportPreview items={[fsme]} onImport={vi.fn()} onCancel={onCancel} />,
  );

  await user.click(screen.getByRole("button", { name: "Abbrechen" }));

  expect(onCancel).toHaveBeenCalledOnce();
});

it("Daten vor dem Geburtsdatum oder in der Zukunft sind markiert und abgewählt", async () => {
  const onImport = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  const early: ImportItem = { ...pocken, dateIssue: "beforeBirth" };
  const later: ImportItem = {
    entry: { ...fsme.entry, date: "2030-01-01" },
    duplicateOf: null,
    dateIssue: "future",
  };
  render(
    <ImportPreview
      items={[early, later, fsme]}
      onImport={onImport}
      onCancel={vi.fn()}
    />,
  );

  expect(
    screen.getByText("Das Datum liegt vor deinem Geburtsdatum."),
  ).toBeTruthy();
  expect(screen.getByText("Das Datum liegt in der Zukunft.")).toBeTruthy();
  expect(checkbox(/Pocken/).checked).toBe(false);
  expect(checkbox(/01\.01\.2030/).checked).toBe(false);
  expect(importButton().textContent).toBe("1 Impfung übernehmen");

  await user.click(checkbox(/Pocken/));
  await user.click(importButton());
  expect(onImport).toHaveBeenCalledWith([early, fsme]);
});

it("erklärt das Ersetzen, wenn es schon eingetragene Impfungen gibt", () => {
  render(
    <ImportPreview
      items={[boostrix, fsme]}
      onImport={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(
    screen.getByText(
      "Hakst du eine schon eingetragene Impfung an, ersetzen die Angaben vom PC den vorhandenen Eintrag.",
    ),
  ).toBeTruthy();
});

it("ohne schon eingetragene Impfungen fehlt der Hinweis zum Ersetzen", () => {
  render(
    <ImportPreview items={[fsme]} onImport={vi.fn()} onCancel={vi.fn()} />,
  );
  expect(screen.queryByText(/ersetzen die Angaben vom PC/)).toBeNull();
});

it("eine angehakte Dublette zeigt, welchen Eintrag sie ersetzt", async () => {
  const user = userEvent.setup();
  render(
    <ImportPreview
      items={[boostrix, fsme]}
      onImport={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  await user.click(checkbox(/Boostrix Polio/));

  expect(
    screen.getByText(
      "Ersetzt den vorhandenen Eintrag: Boostrix Polio, 04.05.2020.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText(/^Schon eingetragen:/)).toBeNull();
  expect(importButton().textContent).toBe("2 Impfungen übernehmen");
});

it("eine zweite angehakte Dublette derselben Impfung kommt neu dazu", async () => {
  const user = userEvent.setup();
  const again: ImportItem = {
    ...boostrix,
    entry: { ...boostrix.entry, date: "2020-05-20", datePrecision: "day" },
  };
  render(
    <ImportPreview
      items={[boostrix, again]}
      onImport={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  const first = () => checkbox(/05\/2020 Boostrix Polio/);
  const second = () => checkbox(/20\.05\.2020 Boostrix Polio/);
  const details = (box: HTMLInputElement) =>
    document.getElementById(box.getAttribute("aria-describedby") ?? "")
      ?.textContent ?? "";

  // Auch in umgekehrter Reihenfolge angehakt ersetzt der erste der Übertragung.
  await user.click(second());
  expect(details(second())).toContain("Ersetzt den vorhandenen Eintrag");
  await user.click(first());
  expect(details(first())).toContain("Ersetzt den vorhandenen Eintrag");
  expect(details(second())).toContain(
    "Kommt neu dazu, weil ein anderer Eintrag Boostrix Polio, 04.05.2020 schon ersetzt.",
  );

  // Abgewählt gibt der erste das Ersetzen an den zweiten ab.
  await user.click(first());
  expect(details(first())).toContain("Schon eingetragen");
  expect(details(second())).toContain("Ersetzt den vorhandenen Eintrag");
});

it("zeigt die Krankheiten nicht doppelt, wenn sie die Bezeichnung sind", () => {
  const onlyDiseases: ImportItem = {
    entry: {
      date: "1990-01-01",
      datePrecision: "year",
      productId: null,
      label: "Tetanus, Diphtherie",
      diseases: ["tetanus", "diphtheria"],
    },
    duplicateOf: null,
    dateIssue: null,
  };
  render(
    <ImportPreview
      items={[onlyDiseases]}
      onImport={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(screen.getAllByText("Tetanus, Diphtherie")).toHaveLength(1);
});
