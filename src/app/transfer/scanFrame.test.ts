import { qrMatrix } from "@/core/formats/qr";
import { encodeTransfer } from "@/core/formats/transfer";
import { matrixToImage } from "@/test/qr";
import { fitWithin, isRepeat, scanFrame } from "./scanFrame";

it("liest einen gezeichneten Teil einer Übertragung", () => {
  const [part] = encodeTransfer(
    {
      id: "K7Q2M9",
      createdAt: "2026-11-27T10:00:00.000Z",
      entries: [
        {
          date: "2020-05-01",
          datePrecision: "month",
          productId: "boostrix-polio",
          label: "Boostrix Polio",
          diseases: ["tetanus"],
        },
      ],
    },
    700,
  );
  expect(scanFrame(matrixToImage(qrMatrix(part), 4))).toBe(part);
});

it("liefert null ohne Code", () => {
  const data = new Uint8ClampedArray(100 * 100 * 4).fill(255);
  expect(scanFrame({ data, width: 100, height: 100 })).toBeNull();
});

describe("fitWithin", () => {
  it("verkleinert die längere Kante auf höchstens die Grenze", () => {
    expect(fitWithin(1920, 1080, 960)).toEqual({ width: 960, height: 540 });
    expect(fitWithin(1080, 1920, 960)).toEqual({ width: 540, height: 960 });
  });
  it("vergrößert nie", () => {
    expect(fitWithin(800, 600, 960)).toEqual({ width: 800, height: 600 });
  });
  it("rundet keine Kante auf 0", () => {
    expect(fitWithin(10000, 2, 960)).toEqual({ width: 960, height: 1 });
  });
});

describe("isRepeat", () => {
  const last = { text: "A", at: 1000 };
  it("meldet denselben Text innerhalb des Fensters als Wiederholung", () => {
    expect(isRepeat(last, "A", 2999, 2000)).toBe(true);
  });
  it("meldet ihn nach dem Fenster wieder", () => {
    expect(isRepeat(last, "A", 3000, 2000)).toBe(false);
  });
  it("ein anderer Text ist nie eine Wiederholung", () => {
    expect(isRepeat(last, "B", 1000, 2000)).toBe(false);
  });
});
