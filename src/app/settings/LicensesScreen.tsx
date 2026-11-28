import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import type { LicenseSummary } from "@/core/licenses";
import { T } from "@/texts";
import { loadLicenseSummary } from "./licenseData";
import { useLoaded } from "./useLoaded";

const LINK_CLASS = "inline-flex min-h-11 items-center self-start underline";

/** Übersicht der verwendeten Software nach Projekten, mit ihren Lizenzen. */
export function LicensesScreen({
  load = loadLicenseSummary,
}: {
  load?: () => Promise<LicenseSummary>;
}) {
  const state = useLoaded(load);
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/einstellungen/info"
        className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        {T.info.title}
      </Link>
      <h1 className="text-2xl font-semibold">{T.licenseScreen.title}</h1>
      {state.status === "loading" && <p>{T.app.loading}</p>}
      {state.status === "failed" && (
        <p role="alert">{T.licenseScreen.loadFailed}</p>
      )}
      {state.status === "ready" && (
        <>
          <p>
            {T.licenseScreen.intro(
              state.value.packages,
              state.value.projects.length,
            )}
          </p>
          <dl className="flex flex-col">
            {state.value.projects.map((p) => (
              <div
                key={p.name}
                className="flex justify-between gap-4 border-b py-1"
              >
                <dt>{p.name}</dt>
                <dd className="text-right text-muted-foreground">
                  {p.licenses.join(", ")}
                </dd>
              </div>
            ))}
          </dl>
          {/* Erst die kurze Erklärung, dann die vollständigen Texte. */}
          <div className="flex flex-col">
            <Link
              href="/einstellungen/info/lizenzen/erklaert"
              className={LINK_CLASS}
            >
              {T.licenseScreen.explainedLink}
            </Link>
            <Link
              href="/einstellungen/info/lizenzen/texte"
              className={LINK_CLASS}
            >
              {T.licenseScreen.textsLink}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
