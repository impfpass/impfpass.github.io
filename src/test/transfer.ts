import { deflateSync } from "fflate";
import { diseaseLabel, type DiseaseId } from "@/core/catalog/diseases";
import { getProduct } from "@/core/catalog/products";
import { encodeBase45 } from "@/core/formats/base45";
import { crc32 } from "@/core/formats/crc32";
import { QR_PART_CHARS } from "@/core/formats/transfer";
import type { DatePrecision, TransferEntry } from "@/core/model";

const PRODUCT_IDS = [
  "boostrix-polio",
  "td-immun",
  "td-pur",
  "tetanol",
  "repevax",
  "infanrix-hexa",
  "priorix",
  "m-m-rvaxpro",
  "polio-oral",
  "engerix-b",
  "twinrix",
  "fsme-immun",
  "encepur",
  "influsplit",
  "vaxigrip",
  "comirnaty",
  "spikevax",
  "shingrix",
  "prevenar-20",
  "gardasil-9",
];

const PRACTICES = [
  "Praxis Dr. med. Muster, Hamburg",
  "Gemeinschaftspraxis Weber & Fischer, Köln",
  "Dr. Anna Schmidt, Kinderärztin, München",
  "Hausarztpraxis am Markt, Leipzig",
  "Gesundheitsamt Frankfurt am Main",
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const pad = (n: number, width: number) => String(n).padStart(width, "0");

/**
 * Feste, wiederholbare Einträge wie aus einem echten Pass: übliche Impfstoffe,
 * Chargen wie `AB123456`, fünf Praxen, Daten über 50 Jahre, einige nur mit
 * Monat oder Jahr, der zweite Eintrag ohne Impfstoff.
 */
export function typicalEntries(n: number): TransferEntry[] {
  // Kleiner Zufallsgenerator (Park-Miller), damit jeder Lauf dasselbe ergibt.
  let seed = 20261127;
  const next = (max: number) => {
    seed = (seed * 48271) % 2147483647;
    return seed % max;
  };
  return Array.from({ length: n }, (_, i): TransferEntry => {
    const year = 1976 + Math.floor((i * 50) / n);
    const month = pad(1 + next(12), 2);
    const day = pad(1 + next(28), 2);
    const precision: DatePrecision =
      i % 11 === 5 ? "year" : i % 7 === 3 ? "month" : "day";
    const date =
      precision === "year"
        ? `${year}-01-01`
        : precision === "month"
          ? `${year}-${month}-01`
          : `${year}-${month}-${day}`;
    const doctor = PRACTICES[i % PRACTICES.length];
    if (i === 1) {
      const diseases: DiseaseId[] = ["tetanus", "diphtheria"];
      return {
        date,
        datePrecision: precision,
        productId: null,
        label: diseaseLabel(diseases),
        diseases,
        doctor,
      };
    }
    const product = getProduct(PRODUCT_IDS[next(PRODUCT_IDS.length)])!;
    const batch =
      LETTERS[next(26)] + LETTERS[next(26)] + pad(next(1_000_000), 6);
    return {
      date,
      datePrecision: precision,
      productId: product.id,
      label: product.name,
      diseases: [...product.diseases],
      ...(precision === "day" && { batch }),
      doctor,
      ...(i % 13 === 6 && { note: "Auffrischung" }),
    };
  });
}

/**
 * Packt beliebiges JSON wie `encodeTransfer` zu Teilzeilen, für Tests mit
 * fremden oder kaputten Inhalten. Baut das Zeilenformat selbst nach.
 */
export function packParts(
  wire: unknown,
  options: { version?: number; id?: string } = {},
): string[] {
  const { version = 1, id = "TEST01" } = options;
  const bytes = deflateSync(new TextEncoder().encode(JSON.stringify(wire)), {
    level: 9,
  });
  const crc = crc32(bytes).toString(16).toUpperCase().padStart(8, "0");
  const data = encodeBase45(bytes);
  const chunks: string[] = [];
  for (let start = 0; start < data.length; start += QR_PART_CHARS) {
    chunks.push(data.slice(start, start + QR_PART_CHARS));
  }
  return chunks.map(
    (chunk, i) =>
      `IP:${version}:${i + 1}/${chunks.length}:${id}:${chunk}:${crc}`,
  );
}
