import { screen } from "@testing-library/react";
import type { LicenseSummary } from "@/core/licenses";
import { renderWithData, seed } from "@/test/helpers";
import { LicensesScreen } from "./LicensesScreen";

const SUMMARY: LicenseSummary = {
  packages: 58,
  projects: [
    { name: "Radix UI", licenses: ["0BSD", "MIT"] },
    { name: "React", licenses: ["MIT"] },
  ],
};
const ROUTE = "/einstellungen/info/lizenzen";

it("zeigt Gesamtzahl und Projekte mit ihren Lizenzen", async () => {
  await seed({});
  await renderWithData(<LicensesScreen load={async () => SUMMARY} />, ROUTE);
  expect(
    await screen.findByText(
      "ImpfPass enthält freie Software von Dritten: 58 Pakete aus 2 Projekten.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Radix UI").nextElementSibling?.textContent).toBe(
    "0BSD, MIT",
  );
  expect(screen.getByText("React").nextElementSibling?.textContent).toBe("MIT");
  expect(
    screen.getByRole("heading", { level: 1, name: "Verwendete Software" }),
  ).toBeTruthy();
});

it("führt zu den Lizenztexten und zurück zur Info-Seite", async () => {
  await seed({});
  await renderWithData(<LicensesScreen load={async () => SUMMARY} />, ROUTE);
  const texts = await screen.findByRole("link", {
    name: "Alle Lizenztexte ansehen",
  });
  expect(texts.getAttribute("href")).toBe(
    "#/einstellungen/info/lizenzen/texte",
  );
  expect(screen.getByRole("link", { name: "Info" }).getAttribute("href")).toBe(
    "#/einstellungen/info",
  );
});

it("zeigt beim Laden einen Hinweis", async () => {
  await seed({});
  await renderWithData(
    <LicensesScreen load={() => new Promise(() => {})} />,
    ROUTE,
  );
  expect(screen.getByText("Wird geladen …")).toBeTruthy();
});

it("meldet, wenn die Angaben nicht geladen werden können, und lässt den Weg zurück offen", async () => {
  await seed({});
  await renderWithData(
    <LicensesScreen load={() => Promise.reject(new Error("offline"))} />,
    ROUTE,
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Lizenzangaben konnten nicht geladen werden. Bitte versuche es später noch einmal.",
  );
  expect(screen.getByRole("link", { name: "Info" })).toBeTruthy();
});
