import { createHash } from "node:crypto";
import { sha256Hex } from "./sha256";

const reference = (s: string) =>
  createHash("sha256").update(s, "utf8").digest("hex");

it("ergibt die Prüfwerte aus FIPS 180-4 für leeren Text und abc", () => {
  expect(sha256Hex("")).toBe(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  expect(sha256Hex("abc")).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

it("rechnet mit UTF-8", () => {
  expect(sha256Hex("Gürtelrose")).toBe(
    "da7661bb0f32f39659771e19f189ee52b3d73b628843e0ca26f1053e2180cd90",
  );
});

it("stimmt für alle Längen bis 200 Zeichen mit node:crypto überein", () => {
  // Deckt die Blockgrenzen bei 55, 56 und 64 Byte ab, auch mit Umlauten.
  for (let n = 0; n <= 200; n++) {
    const ascii = "a".repeat(n);
    const umlaut = "ä".repeat(n);
    expect(sha256Hex(ascii)).toBe(reference(ascii));
    expect(sha256Hex(umlaut)).toBe(reference(umlaut));
  }
});
