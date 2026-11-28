import { T } from "@/texts";
import { BackToSummary } from "./BackToSummary";
import { loadLicenseTexts } from "./licenseData";
import { useLoaded } from "./useLoaded";

/** Die vollständigen Lizenztexte aller Pakete, wie sie der Build erzeugt. */
export function LicenseTextsScreen({
  load = loadLicenseTexts,
}: {
  load?: () => Promise<string>;
}) {
  const state = useLoaded(load);
  return (
    <div className="flex flex-col gap-6">
      <BackToSummary />
      <h1 className="text-2xl font-semibold">{T.licenseScreen.textsTitle}</h1>
      {state.status === "loading" && <p>{T.app.loading}</p>}
      {state.status === "failed" && (
        <p role="alert">{T.licenseScreen.loadFailed}</p>
      )}
      {state.status === "ready" && (
        <pre className="whitespace-pre-wrap break-words text-sm">
          {state.value}
        </pre>
      )}
      {/* Der Text ist lang, der Weg zurück steht auch am Ende. */}
      <BackToSummary />
    </div>
  );
}
