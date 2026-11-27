/** Zeichnet eine QR-Matrix als RGBA-Bild (schwarz auf weiß, mit Ruhezone), damit jsQR sie in Tests lesen kann. */
export function matrixToImage(
  m: boolean[][],
  scale: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const quiet = 4;
  const width = (m.length + 2 * quiet) * scale;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let row = 0; row < m.length; row++) {
    for (let col = 0; col < m.length; col++) {
      if (!m[row][col]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = (col + quiet) * scale + dx;
          const y = (row + quiet) * scale + dy;
          const i = (y * width + x) * 4;
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }
    }
  }
  return { data, width, height };
}
