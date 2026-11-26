import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  await user.click(screen.getByRole("radio", { name: "Krankheit" }));
  expect(screen.getAllByText("Boostrix Polio")).toHaveLength(4);

  expect(data().settings.listSort).toBe("disease");
  const repo = await openRepository();
  await waitFor(async () =>
    expect((await repo.getSettings()).listSort).toBe("disease"),
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

it("gespeicherte Sortierung wird beim Öffnen verwendet", async () => {
  await seed({
    vaccinations: [testVaccination()],
    settings: { leadMonths: 6, seasonDay: "09-01", listSort: "disease" },
  });
  await renderWithData(<ListScreen />, "/impfungen");
  expect(
    screen
      .getByRole("radio", { name: "Krankheit" })
      .getAttribute("aria-checked"),
  ).toBe("true");
  expect(screen.getAllByText("Boostrix Polio")).toHaveLength(4);
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
