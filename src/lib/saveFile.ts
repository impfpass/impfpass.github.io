export type SaveResult = "shared" | "downloaded" | "cancelled";

/**
 * Gibt eine Datei aus. Mit `preferShare` (Standard) zuerst über das
 * Teilen-Menü, etwa auf dem iPhone nach „Dateien“, sonst als Download. Die
 * PC-App übergibt `false`, damit Windows sein Teilen-Fenster nicht öffnet.
 */
export async function saveFile(
  file: File,
  { preferShare = true }: { preferShare?: boolean } = {},
): Promise<SaveResult> {
  if (
    preferShare &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Andere Fehler (etwa NotAllowedError): auf den Download ausweichen.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    // Erst nach dem Start des Downloads freigeben.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return "downloaded";
}
