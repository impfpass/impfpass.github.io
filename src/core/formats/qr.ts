import QRCode from "qrcode";

/** QR-Matrix mit Fehlerkorrektur M; `true` ist ein dunkles Modul. */
export function qrMatrix(text: string): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const rows: boolean[][] = [];
  for (let row = 0; row < modules.size; row++) {
    const cells: boolean[] = [];
    for (let col = 0; col < modules.size; col++) {
      cells.push(Boolean(modules.get(row, col)));
    }
    rows.push(cells);
  }
  return rows;
}
