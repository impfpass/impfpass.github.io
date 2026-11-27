import { qrMatrix } from "@/core/formats/qr";
import { encodeTransfer } from "@/core/formats/transfer";
import { matrixToImage } from "@/test/qr";
import { scanFrame } from "./scanFrame";

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
