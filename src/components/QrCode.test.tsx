import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QrCode } from "./QrCode";

describe("QrCode", () => {
  it("zeichnet ein SVG mit Beschriftung, weißem Grund und dunklen Modulen", () => {
    const { container } = render(<QrCode text="HALLO" label="Code 1 von 3" />);
    const svg = screen.getByRole("img", { name: "Code 1 von 3" });
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe(
      "#ffffff",
    );
    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/\S/);
  });
});
