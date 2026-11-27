import { screen } from "@testing-library/react";
import { RULEBOOK } from "@/core/rules/rulebook";
import { renderWithData, seed } from "@/test/helpers";
import { InfoScreen } from "./InfoScreen";

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
