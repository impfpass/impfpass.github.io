/** Lizenztexte aller Pakete von Dritten, erzeugt beim Build (vite/licenses.ts). */
export const LICENSES_TEXT_FILE = "third-party-licenses.txt";

/** Übersicht der Pakete nach Projekten, erzeugt beim Build (vite/licenses.ts). */
export const LICENSES_SUMMARY_FILE = "third-party-licenses.json";

/** Inhalt von LICENSES_SUMMARY_FILE. */
export type LicenseSummary = {
  /** Anzahl der Pakete im Build. */
  packages: number;
  /** Projekte alphabetisch, je mit den verschiedenen Lizenzen ihrer Pakete. */
  projects: { name: string; licenses: string[] }[];
};
