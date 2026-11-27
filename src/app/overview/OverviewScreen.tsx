import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { DISEASES } from "@/core/catalog/diseases";
import { formatDate } from "@/core/dates";
import { needsTbeQuestion } from "@/core/rules/questions";
import { RULEBOOK } from "@/core/rules/rulebook";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";
import { InstallHint } from "../InstallHint";
import { DiscussCard } from "./DiscussCard";
import { groupForOverview, type Light } from "./lights";
import { NoticeBanner } from "./NoticeBanner";
import { otherHint } from "./otherHint";
import { RecommendationRow } from "./RecommendationRow";
import { TbeQuestion } from "./TbeQuestion";

const LIGHTS: Light[] = ["red", "yellow", "green", "grey"];

export function OverviewScreen() {
  const { person, vaccinations, decisions, recommendations, ruleState } =
    useAppData();
  const groups = groupForOverview(recommendations, vaccinations);
  const notices = ruleState?.notices ?? [];
  const under18 = recommendations.length === 0;
  const showTbe = person
    ? needsTbeQuestion(person, vaccinations, decisions)
    : false;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{T.overview.title}</h1>
      <InstallHint />
      <NoticeBanner notices={notices} />
      {showTbe && <TbeQuestion />}
      {under18 ? (
        <p>{T.overview.under18}</p>
      ) : (
        vaccinations.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <p>{T.overview.noVaccinations}</p>
            <Button asChild>
              <Link href="/impfungen/neu">{T.overview.addFirst}</Link>
            </Button>
          </div>
        )
      )}
      {groups.discuss.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{T.overview.discuss.title}</h2>
          <ul className="flex flex-col gap-3">
            {groups.discuss.map((r) => (
              <DiscussCard key={r.id} rec={r} />
            ))}
          </ul>
        </section>
      )}
      {LIGHTS.map(
        (light) =>
          groups[light].length > 0 && (
            <section key={light} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">
                {T.overview.groups[light]}
              </h2>
              <ul className="flex flex-col gap-2">
                {groups[light].map((r) => (
                  <RecommendationRow key={r.id} rec={r} light={light} />
                ))}
              </ul>
            </section>
          ),
      )}
      {groups.others.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{T.overview.others}</h2>
          <ul className="flex flex-col divide-y">
            {groups.others.map(({ disease, last }) => {
              const hint = otherHint(disease, vaccinations);
              return (
                <li key={disease}>
                  <Link
                    href={`/impfungen/${last.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        {DISEASES[disease].name}
                      </span>
                      <span className="text-muted-foreground">
                        {T.overview.lastVaccinated(
                          formatDate(last.date, last.datePrecision),
                          last.datePrecision,
                        )}
                      </span>
                      {hint && (
                        <span className="text-muted-foreground">{hint}</span>
                      )}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {groups.hidden.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">{T.overview.hidden}</h2>
          <ul className="flex flex-col divide-y">
            {groups.hidden.map((r) => {
              const decision = decisions.find(
                (d) => d.recommendationId === r.id,
              );
              return (
                <li key={r.id}>
                  <Link
                    href={`/empfehlungen/${r.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        {T.rec.names[r.id] ?? r.id}
                      </span>
                      <span className="text-muted-foreground">
                        {r.status === "declined"
                          ? T.overview.declined
                          : T.overview.notNeeded(decision?.reason)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <footer className="flex flex-col gap-1 text-muted-foreground">
        <p>
          {T.overview.footerEdition(
            RULEBOOK.edition,
            formatDate(RULEBOOK.version.slice(0, 10), "day"),
          )}
        </p>
        <p>{T.overview.footerAdvice}</p>
      </footer>
    </div>
  );
}
