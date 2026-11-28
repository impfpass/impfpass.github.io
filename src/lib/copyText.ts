/**
 * Kopiert Text in die Zwischenablage. Klappt das nicht, wird der Inhalt des
 * Ersatzfelds markiert, damit der Anwender mit Strg+C kopieren kann.
 */
export async function copyText(
  text: string,
  fallback?: HTMLTextAreaElement | null,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallback) {
      fallback.focus();
      fallback.select();
    }
    return false;
  }
}
