import { render, screen } from "@testing-library/react";
import { ImportApp } from "./ImportApp";

it("zeigt die Überschrift der PC-App", () => {
  render(<ImportApp />);
  expect(
    screen.getByRole("heading", { level: 1, name: "ImpfPass am PC" }),
  ).toBeTruthy();
});
