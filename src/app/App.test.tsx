import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("zeigt den App-Namen", async () => {
  render(<App />);
  expect(await screen.findByText("ImpfPass")).toBeTruthy();
});
