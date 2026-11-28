/** Bytes je Aufruf von String.fromCharCode, bleibt unter der Grenze für Argumente. */
const CHUNK = 0x8000;

/** Base64url (RFC 4648, Abschnitt 5) ohne Auffüllzeichen `=`. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
