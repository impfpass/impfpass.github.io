import {
  LICENSES_SUMMARY_FILE,
  LICENSES_TEXT_FILE,
  type LicenseSummary,
} from "@/core/licenses";

/**
 * Holt eine Datei von der eigenen Seite. Der Service Worker hat die Dateien
 * vorgespeichert, sie kommen also auch ohne Netz. Wirft bei einem Fehlerstatus
 * und bei einer HTML-Seite: Der Entwicklungsserver antwortet auf Dateien, die
 * erst beim Build entstehen, mit index.html.
 */
async function fetchOwnFile(file: string): Promise<Response> {
  const response = await fetch(import.meta.env.BASE_URL + file);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`${file}: HTML statt der Datei`);
  }
  return response;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Hat die Datei das Format, das diese Version der App anzeigen kann? */
function isLicenseSummary(value: unknown): value is LicenseSummary {
  if (typeof value !== "object" || value === null) return false;
  const { packages, projects } = value as Record<string, unknown>;
  return (
    typeof packages === "number" &&
    Array.isArray(projects) &&
    projects.every(
      (p: unknown) =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Record<string, unknown>).name === "string" &&
        isStringList((p as Record<string, unknown>).licenses),
    )
  );
}

/**
 * Lädt die Übersicht der verwendeten Software. Wirft bei einem unerwarteten
 * Format, etwa wenn eine noch offene alte Seite die Datei einer neueren
 * Version bekommt; die Seite zeigt dann ihre Meldung statt nichts.
 */
export async function loadLicenseSummary(): Promise<LicenseSummary> {
  const data: unknown = await (
    await fetchOwnFile(LICENSES_SUMMARY_FILE)
  ).json();
  if (!isLicenseSummary(data)) {
    throw new Error(`${LICENSES_SUMMARY_FILE}: unerwartetes Format`);
  }
  return data;
}

/** Lädt die vollständigen Lizenztexte. */
export async function loadLicenseTexts(): Promise<string> {
  return (await fetchOwnFile(LICENSES_TEXT_FILE)).text();
}
