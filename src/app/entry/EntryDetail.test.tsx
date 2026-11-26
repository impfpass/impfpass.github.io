import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { EntryDetail } from "./EntryDetail";

it("zeigt die Angaben und löscht nach Rückfrage", async () => {
  await seed({
    persons: [testPerson()],
    vaccinations: [
      testVaccination({
        date: "2016-12-01",
        datePrecision: "month",
        batch: "AC52B123",
        doctor: "Praxis Muster",
      }),
    ],
  });
  const user = userEvent.setup();
  const { data } = await renderWithData(
    <EntryDetail id="v1" />,
    "/impfungen/v1",
  );

  expect(screen.getByRole("heading", { name: "Boostrix Polio" })).toBeTruthy();
  expect(screen.getByText("12/2016")).toBeTruthy();
  expect(screen.getByText("AC52B123")).toBeTruthy();
  expect(screen.getByText("Praxis Muster")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Bearbeiten" }).getAttribute("href"),
  ).toBe("#/impfungen/v1/bearbeiten");

  await user.click(screen.getByRole("button", { name: "Löschen" }));
  expect(await screen.findByText("Diese Impfung löschen?")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Löschen" }));

  await waitFor(() => expect(data().vaccinations).toHaveLength(0));
  expect(window.location.hash).toBe("#/impfungen");
});

it("unbekannte Impfung", async () => {
  await seed({});
  await renderWithData(<EntryDetail id="gibt-es-nicht" />, "/impfungen/x");
  expect(screen.getByText("Diese Impfung gibt es nicht.")).toBeTruthy();
});
