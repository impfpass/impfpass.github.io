import { decodeBase45, encodeBase45 } from "./base45";

const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const text = (b: Uint8Array) => String.fromCharCode(...b);

it("kodiert die Beispiele aus RFC 9285", () => {
  expect(encodeBase45(bytes("AB"))).toBe("BB8");
  expect(encodeBase45(bytes("Hello!!"))).toBe("%69 VD92EX0");
  expect(encodeBase45(bytes("base-45"))).toBe("UJCLQE7W581");
});

it("dekodiert das Beispiel aus RFC 9285", () => {
  expect(text(decodeBase45("QED8WEX0"))).toBe("ietf!");
  expect(text(decodeBase45("%69 VD92EX0"))).toBe("Hello!!");
});

it("wirft bei fremden Zeichen, etwa Kleinbuchstaben", () => {
  expect(() => decodeBase45("qed8wex0")).toThrow();
  expect(() => decodeBase45("QED8WEX0\n")).toThrow();
});

it("wirft bei unmöglicher Länge und bei Werten über dem Bereich", () => {
  // Drei Zeichen ergeben zwei Bytes, zwei Zeichen ein Byte, ein Zeichen nichts.
  expect(() => decodeBase45("QED8")).toThrow();
  // ":::" wäre 44 + 44·45 + 44·45² = 91124 > 65535.
  expect(() => decodeBase45(":::")).toThrow();
  // "::" wäre 44 + 44·45 = 2024 > 255.
  expect(() => decodeBase45("::")).toThrow();
});

it("übersteht Hin und zurück für Längen 0 bis 10", () => {
  for (let length = 0; length <= 10; length++) {
    const input = Uint8Array.from({ length }, (_, i) => (i * 97 + 255) % 256);
    const encoded = encodeBase45(input);
    expect(encoded).toMatch(/^[0-9A-Z $%*+\-./:]*$/);
    expect([...decodeBase45(encoded)]).toEqual([...input]);
  }
});

it("übersteht Hin und zurück für die Grenzwerte 0 und 255", () => {
  const input = Uint8Array.from([0, 0, 255, 255, 0, 255, 255]);
  expect([...decodeBase45(encodeBase45(input))]).toEqual([...input]);
});
