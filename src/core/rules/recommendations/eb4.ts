import type { SourceRef } from "../types";

/** Fundstelle in Epid. Bull. 4/2026 (STIKO-Empfehlungen 2026); Seitenzahlen sind PDF-Seiten. */
export function eb4(page: number, section: string): SourceRef {
  return {
    edition: "Epid Bull 4/2026",
    date: "2026-01-22",
    section,
    page,
    url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/04_26.pdf?__blob=publicationFile",
  };
}
