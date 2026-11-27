import type { SourceRef } from "../types";

export const EB27_URL =
  "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/27_26.pdf?__blob=publicationFile";

/**
 * Fundstelle in Epid. Bull. 27/2026 (Reiseimpfempfehlungen STIKO/DTG 2026).
 * Seitenzahlen sind PDF-Seiten, also die gedruckte Seitenzahl plus 10.
 */
export function eb27(page: number, section: string): SourceRef {
  return {
    edition: "Epid Bull 27/2026",
    date: "2026-07-02",
    section,
    page,
    url: EB27_URL,
  };
}
