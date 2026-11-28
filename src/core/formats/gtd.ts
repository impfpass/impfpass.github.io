import { deflateSync } from "fflate";
import type { ISODate } from "../model";
import { toBase64Url } from "./base64url";

/**
 * Übergabeformat an die GTD-App, Version 1 (Spec 9.3). Die Bedeutung von
 * Version 1 ändert sich nie; neue oder geänderte Felder brauchen Version 2.
 */
export type GtdItem =
  | {
      ref: string;
      op: "upsert";
      title: string;
      date: ISODate;
      time: null;
      description: string;
      checklist: string[];
    }
  | { ref: string; op: "cancel" };

export interface GtdPayload {
  format: "impfpass-gtd";
  version: 1;
  created: string;
  items: GtdItem[];
}

export const GTD_TEXT_PREFIX = "IMPFPASS-GTD:1:";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

/** JSON als UTF-8, mit deflate gepackt, in Base64url ohne `=`. */
export function encodeGtdData(p: GtdPayload): string {
  const json = new TextEncoder().encode(JSON.stringify(p));
  return toBase64Url(deflateSync(json, { level: 9 }));
}

/**
 * Link auf die Übernahmeseite. Die Daten stehen im Fragment, das der Browser
 * nicht an den Server schickt.
 */
export function gtdLink(address: string, p: GtdPayload): string {
  const url = new URL(address);
  url.hash = `impfpass=${encodeGtdData(p)}`;
  return url.href;
}

/** Text zum Kopieren und Einfügen in der GTD-App. */
export function gtdText(p: GtdPayload): string {
  return GTD_TEXT_PREFIX + encodeGtdData(p);
}

/**
 * Prüft die Adresse der Übernahmeseite. `null`: leer, die Übergabe ist aus.
 * Erlaubt ist https, für Tests mit der GTD-App am PC auch http auf dem
 * eigenen Rechner. Ein `#`-Teil entfällt, ImpfPass setzt ihn selbst.
 */
export function normalizeGtdAddress(raw: string): string | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "invalid";
  }
  const local = url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname);
  if (url.protocol !== "https:" && !local) return "invalid";
  url.hash = "";
  return url.href;
}
