import { screen, within } from "@testing-library/react";
import type { LicenseSummary } from "@/core/licenses";
import { renderWithData, seed } from "@/test/helpers";
import { T } from "@/texts";
import { LicenseExplanationsScreen } from "./LicenseExplanationsScreen";

const ROUTE = "/einstellungen/info/lizenzen/erklaert";
const SUMMARY: LicenseSummary = {
  packages: 4,
  projects: [
    { name: "jsQR", licenses: ["Apache-2.0"] },
    { name: "Radix UI", licenses: ["0BSD", "MIT"] },
    { name: "React", licenses: ["MIT"] },
    { name: "Neu", licenses: ["WTFPL"] },
  ],
};

/** Abschnitt einer Lizenz, gefunden über ihre Überschrift. */
const sectionOf = (id: string) =>
  screen.getByRole("heading", { level: 2, name: id }).closest("section")!;

it("erklärt nur die vorkommenden Lizenzen, in fester Reihenfolge", async () => {
  await seed({});
  await renderWithData(
    <LicenseExplanationsScreen load={async () => SUMMARY} />,
    ROUTE,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Lizenzen kurz erklärt" }),
  ).toBeTruthy();
  expect(await screen.findByText(T.licenseScreen.explainedIntro)).toBeTruthy();
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
  ).toEqual(["MIT", "Apache-2.0", "0BSD", "WTFPL"]);
  expect(screen.getByText(T.licenseScreen.explainedOutro)).toBeTruthy();
});

it("nennt je Lizenz Erklärung und Projekte", async () => {
  await seed({});
  await renderWithData(
    <LicenseExplanationsScreen load={async () => SUMMARY} />,
    ROUTE,
  );
  await screen.findByRole("heading", { level: 2, name: "MIT" });
  const mit = within(sectionOf("MIT"));
  expect(mit.getByText(T.licenseScreen.explanations.MIT)).toBeTruthy();
  expect(mit.getByText("Kommt vor bei: Radix UI, React")).toBeTruthy();
  expect(
    within(sectionOf("Apache-2.0")).getByText("Kommt vor bei: jsQR"),
  ).toBeTruthy();
});

it("zeigt eine Lizenz ohne Erklärung mit Hinweis statt sie wegzulassen", async () => {
  await seed({});
  await renderWithData(
    <LicenseExplanationsScreen load={async () => SUMMARY} />,
    ROUTE,
  );
  await screen.findByRole("heading", { level: 2, name: "WTFPL" });
  const wtfpl = within(sectionOf("WTFPL"));
  expect(wtfpl.getByText(T.licenseScreen.unexplained)).toBeTruthy();
  expect(wtfpl.getByText("Kommt vor bei: Neu")).toBeTruthy();
});

it("führt zurück zur Übersicht", async () => {
  await seed({});
  await renderWithData(
    <LicenseExplanationsScreen load={async () => SUMMARY} />,
    ROUTE,
  );
  expect(
    screen
      .getByRole("link", { name: "Verwendete Software" })
      .getAttribute("href"),
  ).toBe("#/einstellungen/info/lizenzen");
});

it("meldet, wenn die Angaben nicht geladen werden können", async () => {
  await seed({});
  await renderWithData(
    <LicenseExplanationsScreen
      load={() => Promise.reject(new Error("offline"))}
    />,
    ROUTE,
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    T.licenseScreen.loadFailed,
  );
  expect(
    screen.getByRole("link", { name: "Verwendete Software" }),
  ).toBeTruthy();
});
