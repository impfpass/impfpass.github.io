import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { qrMatrix } from "@/core/formats/qr";
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

  it("setzt jedes dunkle Modul mit Ruhezone von 4 Modulen an die richtige Stelle", () => {
    const text = "HALLO WELT 123";
    const m = qrMatrix(text);
    const { container } = render(<QrCode text={text} label="Code" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe(
      `0 0 ${m.length + 8} ${m.length + 8}`,
    );

    const d = container.querySelector("path")!.getAttribute("d")!;
    const segments = [...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
    expect(segments.map((s) => s[0]).join("")).toBe(d);

    const expected: string[] = [];
    m.forEach((cells, row) =>
      cells.forEach((dark, col) => {
        if (dark) expected.push(`${col + 4},${row + 4}`);
      }),
    );
    expect(segments).toHaveLength(expected.length);
    expect(new Set(segments.map((s) => `${s[1]},${s[2]}`))).toEqual(
      new Set(expected),
    );
  });
});
