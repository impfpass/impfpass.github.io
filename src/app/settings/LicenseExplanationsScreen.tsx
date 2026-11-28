import { Link } from "wouter";
import type { LicenseSummary } from "@/core/licenses";
import { T } from "@/texts";
import { BackToSummary } from "./BackToSummary";
import { loadLicenseSummary } from "./licenseData";
import { useLoaded } from "./useLoaded";

const EXPLANATIONS: Readonly<Record<string, string>> =
  T.licenseScreen.explanations;

/**
 * Die vorkommenden Lizenzen in der Reihenfolge der Erklärungen, dahinter
 * Lizenzen ohne Erklärung, je mit den Projekten, die sie nutzen.
 */
function licensesInUse(summary: LicenseSummary) {
  const used = [...new Set(summary.projects.flatMap((p) => p.licenses))];
  const explained = Object.keys(EXPLANATIONS).filter((id) => used.includes(id));
  const unexplained = used.filter((id) => !(id in EXPLANATIONS));
  return [...explained, ...unexplained].map((id) => ({
    id,
    text: EXPLANATIONS[id] ?? T.licenseScreen.unexplained,
    projects: summary.projects
      .filter((p) => p.licenses.includes(id))
      .map((p) => p.name),
  }));
}

/** Kurze Erklärung jeder Lizenz, die in ImpfPass vorkommt. */
export function LicenseExplanationsScreen({
  load = loadLicenseSummary,
}: {
  load?: () => Promise<LicenseSummary>;
}) {
  const state = useLoaded(load);
  return (
    <div className="flex flex-col gap-6">
      <BackToSummary />
      <h1 className="text-2xl font-semibold">
        {T.licenseScreen.explainedTitle}
      </h1>
      {state.status === "loading" && <p>{T.app.loading}</p>}
      {state.status === "failed" && (
        <p role="alert">{T.licenseScreen.loadFailed}</p>
      )}
      {state.status === "ready" && (
        <>
          <p>{T.licenseScreen.explainedIntro}</p>
          {licensesInUse(state.value).map((l) => (
            <section key={l.id} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{l.id}</h2>
              <p>{l.text}</p>
              <p className="text-muted-foreground">
                {T.licenseScreen.usedBy(l.projects)}
              </p>
            </section>
          ))}
          <p>{T.licenseScreen.explainedOutro}</p>
          <Link
            href="/einstellungen/info/lizenzen/texte"
            className="inline-flex min-h-11 items-center self-start underline"
          >
            {T.licenseScreen.textsLink}
          </Link>
        </>
      )}
    </div>
  );
}
