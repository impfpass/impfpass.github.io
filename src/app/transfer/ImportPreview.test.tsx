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

  expect(onImport).toHaveBeenCalledWith([boostrix.entry, pocken.entry]);
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
