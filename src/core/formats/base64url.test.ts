import { toBase64Url } from "./base64url";

it("schreibt ohne Auffüllzeichen und mit - und _ statt + und /", () => {
  expect(toBase64Url(new Uint8Array([]))).toBe("");
  expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
  expect(toBase64Url(new Uint8Array([0, 0, 0]))).toBe("AAAA");
  expect(toBase64Url(new Uint8Array([0xfa]))).toBe("-g");
});

it("stimmt für Zufallsbytes mit Buffer überein", () => {
  const bytes = new Uint8Array(1000);
  crypto.getRandomValues(bytes);
  expect(toBase64Url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
});

it("schafft auch große Datenmengen", () => {
  const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
  expect(toBase64Url(bytes)).toBe(Buffer.from(bytes).toString("base64url"));
});
