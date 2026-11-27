import { crc32 } from "./crc32";

const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

it("ergibt den Prüfwert aus der Norm für 123456789, vorzeichenlos", () => {
  // 0xCBF43926 hat das höchste Bit gesetzt und wäre als int32 negativ.
  expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
});

it("ergibt bekannte Werte für leere Daten und einen Satz", () => {
  expect(crc32(new Uint8Array(0))).toBe(0);
  expect(crc32(bytes("The quick brown fox jumps over the lazy dog"))).toBe(
    0x414fa339,
  );
});
