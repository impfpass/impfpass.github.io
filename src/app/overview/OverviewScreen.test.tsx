import { screen } from "@testing-library/react";
import {
  renderWithData,
  seed,
  testPerson,
  testVaccination,
} from "@/test/helpers";
import { OverviewScreen } from "./OverviewScreen";

it("zeigt je Krankheit die letzte Impfung und den Hinweis auf spätere Empfehlungen", async () => {
  await seed({
    persons: [testPerson()],
    vaccinations: [
      testVaccination({ id: "bp", date: "2020-05-04" }),
      testVaccination({
        id: "pocken",
        date: "1975-01-01",
        datePrecision: "year",
        productId: "pocken",
        label: "Pocken-Impfstoff",
        diseases: ["smallpox"],
      }),
    ],
  });
  await renderWithData(<OverviewScreen />);

  expect(screen.getByRole("heading", { name: "Übersicht" })).toBeTruthy();
  const tetanus = screen.getByRole("link", { name: /Tetanus/ });
  expect(tetanus.textContent).toContain("zuletzt geimpft am 04.05.2020");
  expect(tetanus.getAttribute("href")).toBe("#/impfungen/bp");
  expect(screen.getByRole("link", { name: /Pocken/ }).textContent).toContain(
    "zuletzt geimpft 1975",
  );
  expect(
    screen.getByText(
      "Empfehlungen und Erinnerungen folgen in einer späteren Version.",
    ),
  ).toBeTruthy();
});

it("ohne Impfungen lädt die Übersicht zum Eintragen ein", async () => {
  await seed({});
  await renderWithData(<OverviewScreen />);
  expect(screen.getByText("Noch keine Impfungen eingetragen.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Impfung eintragen" })).toBeTruthy();
});
