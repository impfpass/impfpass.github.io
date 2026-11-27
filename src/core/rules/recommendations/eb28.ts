import type { SourceRef } from "../types";

/** Fundstelle in Epid. Bull. 28/2026 (COVID-19-Beschluss vom 09.07.2026); Seitenzahlen sind PDF-Seiten. */
export function eb28(page: number, section: string): SourceRef {
  return {
    edition: "Epid Bull 28/2026",
    date: "2026-07-09",
    section,
    page,
    url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/28_26.pdf?__blob=publicationFile",
  };
}
