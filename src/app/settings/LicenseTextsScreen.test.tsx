import { screen } from "@testing-library/react";
import { renderWithData, seed } from "@/test/helpers";
import { LicenseTextsScreen } from "./LicenseTextsScreen";

const ROUTE = "/einstellungen/info/lizenzen/texte";

it("zeigt die Lizenztexte umbrechend und führt oben und unten zurück zur Übersicht", async () => {
  await seed({});
  await renderWithData(
    <LicenseTextsScreen
      load={async () => "react 19.0.0\nLizenz: MIT\n\nMIT License"}
    />,
    ROUTE,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Lizenztexte" }),
  ).toBeTruthy();
  const text = await screen.findByText(/MIT License/);
  expect(text.tagName).toBe("PRE");
  // Lange Zeilen wie URLs brechen um, die Seite scrollt nicht seitlich.
  expect(text.className).toContain("whitespace-pre-wrap");
  expect(text.className).toContain("break-words");
  const back = screen.getAllByRole("link", { name: "Verwendete Software" });
  expect(back).toHaveLength(2);
  for (const link of back) {
    expect(link.getAttribute("href")).toBe("#/einstellungen/info/lizenzen");
  }
});

it("meldet, wenn die Texte nicht geladen werden können", async () => {
  await seed({});
  await renderWithData(
    <LicenseTextsScreen load={() => Promise.reject(new Error("offline"))} />,
    ROUTE,
  );
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Lizenzangaben konnten nicht geladen werden. Bitte versuche es später noch einmal.",
  );
  expect(
    screen.getAllByRole("link", { name: "Verwendete Software" }).length,
  ).toBeGreaterThan(0);
});
