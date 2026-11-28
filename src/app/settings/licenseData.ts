import {
  LICENSES_SUMMARY_FILE,
  LICENSES_TEXT_FILE,
  type LicenseSummary,
} from "@/core/licenses";

/**
 * Lädt die Übersicht der verwendeten Software von der eigenen Seite. Der
 * Service Worker hat die Datei vorgespeichert, sie kommt also auch ohne Netz.
 */
export async function loadLicenseSummary(): Promise<LicenseSummary> {
  const response = await fetch(
    import.meta.env.BASE_URL + LICENSES_SUMMARY_FILE,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as LicenseSummary;
}

/** Lädt die vollständigen Lizenztexte von der eigenen Seite, auch ohne Netz. */
export async function loadLicenseTexts(): Promise<string> {
  const response = await fetch(import.meta.env.BASE_URL + LICENSES_TEXT_FILE);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
