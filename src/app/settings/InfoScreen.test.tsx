import { screen } from "@testing-library/react";
import { RULEBOOK } from "@/core/rules/rulebook";
import { renderWithData, seed } from "@/test/helpers";
import { InfoScreen } from "./InfoScreen";

it("verweist innerhalb der App auf die verwendete Software", async () => {
  await seed({});
  await renderWithData(<InfoScreen />);
  expect(
    screen.getByRole("heading", { level: 2, name: "Verwendete Software" }),
  ).toBeTruthy();
  expect(
    screen.getByText(/Eine Übersicht zeigt, welche das sind/),
  ).toBeTruthy();
  const link = screen.getByRole("link", { name: "Übersicht ansehen" });
  expect(link.getAttribute("href")).toBe("#/einstellungen/info/lizenzen");
  // Kein neues Fenster: In der App vom Home-Bildschirm käme man nicht zurück.
  expect(link.getAttribute("target")).toBeNull();
});

it("nennt STIKO-Stand, Regelwerk-Version und Quellen", async () => {
  await seed({});
  await renderWithData(<InfoScreen />);
  expect(screen.getByText(`STIKO-Stand: ${RULEBOOK.edition}`)).toBeTruthy();
  expect(
    screen.getByText(`Regelwerk-Version: ${RULEBOOK.version}`),
  ).toBeTruthy();
  for (const s of RULEBOOK.sources) {
    expect(
      screen.getByRole("link", { name: s.label }).getAttribute("href"),
    ).toBe(s.url);
  }
  expect(
    screen.getByText(/selbst aus den Empfehlungen der STIKO/),
  ).toBeTruthy();
});
