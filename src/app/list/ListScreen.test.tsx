import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ListSort } from "@/core/model";
import { openRepository } from "@/core/storage/repository";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { ListScreen } from "./ListScreen";

it("Sortierung wird gespeichert und nach Löschen ist der Eintrag überall weg", async () => {
  await seed({ persons: [testPerson()], vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  const { data } = await renderWithData(<ListScreen />, "/impfungen");

  expect(screen.getAllByText("Boostrix Polio")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Krankheit" }));
  await waitFor(() => expect(data().settings.listSort).toBe("disease-asc"));
  expect(screen.getAllByText("Boostrix Polio")).toHaveLength(4);
  const repo = await openRepository();
  await waitFor(async () =>
    expect((await repo.getSettings()).listSort).toBe("disease-asc"),
  );

  await act(() => data().actions.deleteVaccination("v1"));
  expect(screen.queryAllByText("Boostrix Polio")).toHaveLength(0);
});

it("zeigt Datum, Impfstoff und Krankheiten einer Impfung", async () => {
  await seed({
    vaccinations: [
      testVaccination({ date: "2016-12-01", datePrecision: "month" }),
    ],
  });
  await renderWithData(<ListScreen />, "/impfungen");
  const link = screen.getByRole("link", { name: /Boostrix Polio/ });
  expect(link.textContent).toContain("12/2016");
  expect(link.textContent).toContain(
    "Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio)",
  );
  expect(link.getAttribute("href")).toBe("#/impfungen/v1");
});

it("erneutes Antippen dreht die Reihenfolge um", async () => {
  await seed({
    vaccinations: [
      testVaccination({ id: "bp", date: "2020-01-01" }),
      testVaccination({
        id: "sh",
        date: "2010-01-01",
        productId: "shingrix",
        label: "Shingrix",
        diseases: ["zoster"],
      }),
    ],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(<ListScreen />, "/impfungen");
  const rows = () =>
    screen.getAllByRole("link").map((l) => l.getAttribute("href"));
  const headings = () =>
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  const pressed = (name: string) =>
    screen.getByRole("button", { name }).getAttribute("aria-pressed");
  const status = () => screen.getByRole("status").textContent;

  expect(pressed("Datum")).toBe("true");
  expect(status()).toContain("Neueste zuerst");
  expect(rows()).toEqual(["#/impfungen/bp", "#/impfungen/sh"]);

  // Das Speichern läuft asynchron, erst danach ändert sich die Anzeige.
  const sortedBy = (value: string) =>
    waitFor(() => expect(data().settings.listSort).toBe(value));

  await user.click(screen.getByRole("button", { name: "Datum" }));
  await sortedBy("date-asc");
  expect(status()).toContain("Älteste zuerst");
  expect(rows()).toEqual(["#/impfungen/sh", "#/impfungen/bp"]);

  await user.click(screen.getByRole("button", { name: "Impfstoff" }));
  await sortedBy("product-asc");
  expect(pressed("Impfstoff")).toBe("true");
  expect(pressed("Datum")).toBe("false");
  expect(status()).toContain("A bis Z");
  expect(headings()).toEqual(["Boostrix Polio", "Shingrix"]);

  await user.click(screen.getByRole("button", { name: "Impfstoff" }));
  await sortedBy("product-desc");
  expect(status()).toContain("Z bis A");
  expect(headings()).toEqual(["Shingrix", "Boostrix Polio"]);

  await user.click(screen.getByRole("button", { name: "Krankheit" }));
  await sortedBy("disease-asc");
  expect(status()).toContain("A bis Z");
  expect(headings()[0]).toBe("Diphtherie");
  await user.click(screen.getByRole("button", { name: "Krankheit" }));
  await sortedBy("disease-desc");
  expect(headings()[0]).toBe("Tetanus");
});

it("gespeicherte Sortierung älterer Versionen wird beim Öffnen verwendet", async () => {
  await seed({
    vaccinations: [testVaccination()],
    settings: {
      leadMonths: 6,
      seasonDay: "09-01",
      listSort: "disease" as string as ListSort,
    },
  });
  await renderWithData(<ListScreen />, "/impfungen");
  expect(
    screen
      .getByRole("button", { name: "Krankheit" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByRole("status").textContent).toContain("A bis Z");
  expect(screen.getAllByText("Boostrix Polio")).toHaveLength(4);
});

it("fehlgeschlagenes Speichern der Sortierung wird gemeldet", async () => {
  await seed({ vaccinations: [testVaccination()] });
  const user = userEvent.setup();
  await renderWithData(<ListScreen />, "/impfungen");
  const put = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
  try {
    await user.click(screen.getByRole("button", { name: "Krankheit" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Speichern hat nicht geklappt",
    );
  } finally {
    put.mockRestore();
  }
});

it("leere Liste lädt zum Eintragen ein", async () => {
  await seed({});
  await renderWithData(<ListScreen />, "/impfungen");
  expect(screen.getByText("Noch keine Impfungen eingetragen.")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Impfung eintragen" })
      .getAttribute("href"),
  ).toBe("#/impfungen/neu");
});
