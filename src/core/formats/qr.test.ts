import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { matrixToImage } from "@/test/qr";
import { typicalEntries } from "@/test/transfer";
import { qrMatrix } from "./qr";
import { encodeTransfer } from "./transfer";

const parts = encodeTransfer({
  id: "K7Q2M9",
  createdAt: "2026-11-27T10:00:00.000Z",
  entries: typicalEntries(50),
});

describe("qrMatrix", () => {
  it("liefert eine quadratische Matrix mit 17 + 4 · Version Zeilen", () => {
    const m = qrMatrix("HALLO");
    expect(m).toHaveLength(21);
    expect(m.every((row) => row.length === 21)).toBe(true);
    expect((m.length - 17) % 4).toBe(0);
  });

  it("lässt sich mit jsQR zurücklesen, für jeden Teil von 50 typischen Einträgen", () => {
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      const { data, width, height } = matrixToImage(qrMatrix(part), 4);
      expect(jsQR(data, width, height)?.data).toBe(part);
    }
  });

  it("bleibt bei höchstens Version 17 (85 × 85 Module)", () => {
    for (const part of parts) {
      expect(qrMatrix(part).length).toBeLessThanOrEqual(85);
    }
  });
});
