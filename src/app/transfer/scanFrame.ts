import jsQR from "jsqr";

/** Liest einen QR-Code aus einem Kamerabild (RGBA). Ohne Code `null`. */
export function scanFrame(image: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): string | null {
  // Die Codes vom PC sind immer dunkel auf hell, das spart die Suche invertiert.
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  return result ? result.data : null;
}

/** Skaliert so, dass die längere Kante höchstens `maxEdge` misst; nie größer, nie 0. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Ist `text` derselbe wie der zuletzt gemeldete, innerhalb von `windowMs`? */
export function isRepeat(
  last: { text: string; at: number },
  text: string,
  now: number,
  windowMs: number,
): boolean {
  return text === last.text && now - last.at < windowMs;
}
