import type { SourceRef } from "../types";

/** Fundstelle in Epid. Bull. 45/2025 (Herpes-zoster-Beschluss vom 06.11.2025); Seitenzahlen sind PDF-Seiten. */
export function eb45(page: number, section: string): SourceRef {
  return {
    edition: "Epid Bull 45/2025",
    date: "2025-11-06",
    section,
    page,
    url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2025/45_25.pdf?__blob=publicationFile",
  };
}
