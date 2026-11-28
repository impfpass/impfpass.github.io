import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { T } from "@/texts";
import { loadLicenseTexts } from "./licenseData";

type State =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; text: string };

function BackToSummary() {
  return (
    <Link
      href="/einstellungen/info/lizenzen"
      className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
      {T.licenseScreen.title}
    </Link>
  );
}

/** Die vollständigen Lizenztexte aller Pakete, wie sie der Build erzeugt. */
export function LicenseTextsScreen({
  load = loadLicenseTexts,
}: {
  load?: () => Promise<string>;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    load().then(
      (text) => {
        if (active) setState({ status: "ready", text });
      },
      () => {
        if (active) setState({ status: "failed" });
      },
    );
    return () => {
      active = false;
    };
  }, [load]);

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
          {state.text}
        </pre>
      )}
      {/* Der Text ist lang, der Weg zurück steht auch am Ende. */}
      <BackToSummary />
    </div>
  );
}
