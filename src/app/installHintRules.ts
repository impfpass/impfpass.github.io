/** iPhone, iPad oder iPod; der Hinweistext beschreibt das Teilen-Menü von iOS. */
const IOS = /\b(iPhone|iPad|iPod)\b/;

export function shouldShowInstallHint(
  ua: string,
  standalone: boolean,
  dismissed: boolean,
): boolean {
  return IOS.test(ua) && !standalone && !dismissed;
}

/** Läuft ImpfPass als App vom Home-Bildschirm? */
export function isStandalone(): boolean {
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayMode;
}
