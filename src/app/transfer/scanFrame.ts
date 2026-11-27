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
