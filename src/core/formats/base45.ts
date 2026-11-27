/**
 * Base45 nach RFC 9285. Nutzt nur Zeichen des alphanumerischen QR-Modus und
 * übersteht Kopieren und Einfügen.
 */
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const VALUES: ReadonlyMap<string, number> = new Map(
  [...ALPHABET].map((c, i) => [c, i]),
);

export function encodeBase45(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const n = bytes[i] * 256 + bytes[i + 1];
    out += ALPHABET[n % 45] + ALPHABET[Math.floor(n / 45) % 45];
    out += ALPHABET[Math.floor(n / 2025)];
  }
  if (bytes.length % 2 === 1) {
    const n = bytes[bytes.length - 1];
    out += ALPHABET[n % 45] + ALPHABET[Math.floor(n / 45)];
  }
  return out;
}

/** Wirft bei fremden Zeichen, unmöglicher Länge und Werten über dem Bereich. */
export function decodeBase45(s: string): Uint8Array {
  if (s.length % 3 === 1) {
    throw new SyntaxError("Base45: unmögliche Länge");
  }
  const value = (i: number) => {
    const v = VALUES.get(s[i]);
    if (v === undefined) throw new SyntaxError("Base45: fremdes Zeichen");
    return v;
  };
  const out = new Uint8Array(
    Math.floor(s.length / 3) * 2 + (s.length % 3 === 2 ? 1 : 0),
  );
  let o = 0;
  for (let i = 0; i < s.length; i += 3) {
    if (i + 2 < s.length) {
      const n = value(i) + value(i + 1) * 45 + value(i + 2) * 2025;
      if (n > 0xffff) throw new SyntaxError("Base45: Wert zu groß");
      out[o++] = n >> 8;
      out[o++] = n & 0xff;
    } else {
      const n = value(i) + value(i + 1) * 45;
      if (n > 0xff) throw new SyntaxError("Base45: Wert zu groß");
      out[o++] = n;
    }
  }
  return out;
}
