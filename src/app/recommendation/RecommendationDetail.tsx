import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, todayISO } from "@/core/dates";
import type { Decision } from "@/core/model";
import { RULEBOOK } from "@/core/rules/rulebook";
import type { Recommendation } from "@/core/rules/types";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";
import { vaccinationName } from "../format";
import { sortByDate } from "../list/grouping";
import { DiscussReason } from "../overview/DiscussCard";
import { statusText } from "../overview/statusText";

const R = T.rec.detail.reason;
const NN = T.rec.detail.notNeededReasons;
const NOT_NEEDED_CHOICES = [NN.illness, NN.serology, NN.otherCard, NN.other];

function BackLink() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
      {T.nav.overview}
    </Link>
  );
}

function ReasonSentence({ rec }: { rec: Recommendation }) {
  const r = rec.reason;
  const day = (d: string) => formatDate(d, "day");
  switch (r.kind) {
    case "booster":
      return <p>{R.booster(day(r.lastDate), r.intervalYears)}</p>;
    case "after_dose":
      return <p>{R.afterDose(day(r.lastDate), r.intervalYears)}</p>;
    case "age":
      return <p>{R.age(r.age)}</p>;
    case "with_td":
      return <p>{R.withTd}</p>;
    case "series":
      return <p>{R.series(r.given, r.total)}</p>;
    case "catch_up":
      return <p>{R.catchUp(r.given, r.total)}</p>;
    case "season":
      return <p>{R.season(r.label)}</p>;
    case "indication":
      return <p>{R[r.indication]}</p>;
    case "complete":
      return <p>{R.complete}</p>;
    case "discuss":
      return <DiscussReason rec={rec} />;
    case "none":
      return <p>{R.none}</p>;
  }
}

function NotNeededForm({
  onSave,
  onCancel,
}: {
  onSave: (reason: string) => void;
  onCancel: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [missing, setMissing] = useState(false);
  const other = choice === NN.other;

  const submit = () => {
    if (choice === null) return;
    const reason = other ? text.trim() : choice;
    if (!reason) {
      setMissing(true);
      return;
    }
    onSave(reason);
  };

  return (
    <fieldset className="flex flex-col gap-1 rounded-lg border p-3">
      <legend className="px-1 font-medium">{NN.legend}</legend>
      <p className="text-muted-foreground">{T.rec.detail.notNeededHint}</p>
      {NOT_NEEDED_CHOICES.map((c) => (
        <label key={c} className="flex min-h-11 items-center gap-3">
          <input
            type="radio"
            name="not-needed-reason"
            value={c}
            checked={choice === c}
            onChange={() => {
              setChoice(c);
              setMissing(false);
            }}
            className="size-5 accent-primary"
          />
          {c}
        </label>
      ))}
      {other && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="not-needed-text">{T.rec.detail.reasonLabel}</Label>
          <Input
            id="not-needed-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMissing(false);
            }}
            aria-invalid={missing}
            aria-describedby={missing ? "not-needed-error" : undefined}
          />
          {missing && (
            <p id="not-needed-error" className="text-destructive">
              {T.rec.detail.reasonMissing}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" disabled={choice === null} onClick={submit}>
          {T.rec.detail.save}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {T.rec.detail.cancel}
        </Button>
      </div>
    </fieldset>
  );
}

function DoctorAnswer({
  rec,
  decision,
  run,
}: {
  rec: Recommendation;
  decision: Decision | undefined;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const { actions } = useAppData();
  const D = T.overview.discuss;
  const options = [
    { key: "doctor_recommends", label: D.doctorRecommends },
    { key: "doctor_not_applicable", label: D.notApplicable },
    { key: "open", label: T.rec.detail.stillOpen },
  ] as const;
  const selected =
    decision?.kind === "doctor_recommends" ||
    decision?.kind === "doctor_not_applicable"
      ? decision.kind
      : "open";
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{T.rec.detail.doctorAnswer}</h2>
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="group"
        aria-label={T.rec.detail.doctorAnswer}
      >
        {options.map((o) => (
          <Button
            key={o.key}
            type="button"
            variant={o.key === selected ? "default" : "outline"}
            aria-pressed={o.key === selected}
            onClick={() =>
              run(() =>
                o.key === "open"
                  ? actions.deleteDecision(rec.id)
                  : actions.saveDecision({
                      recommendationId: rec.id,
                      kind: o.key,
                    }),
              )
            }
          >
            {o.label}
          </Button>
        ))}
      </div>
      {decision && (
        <p className="text-muted-foreground">
          {T.rec.detail.answeredOn(
            formatDate(todayISO(new Date(decision.at)), "day"),
          )}
        </p>
      )}
    </section>
  );
}

export function RecommendationDetail({ id }: { id: string }) {
  const { person, vaccinations, decisions, recommendations, actions } =
    useAppData();
  const [failed, setFailed] = useState(false);
  const [askReason, setAskReason] = useState(false);
  const rec = recommendations.find((r) => r.id === id);

  if (!rec) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <p>{T.rec.detail.notFound}</p>
      </div>
    );
  }

  const D = T.rec.detail;
  const rule = RULEBOOK.rules.find((r) => r.id === id);
  const decision = decisions.find((d) => d.recommendationId === id);
  const change = RULEBOOK.changes
    .filter((c) => c.ids.includes(id))
    .sort((a, b) => b.validSince.localeCompare(a.validSince))[0];
  const related = sortByDate(
    vaccinations.filter((v) =>
      v.diseases.some((d) => rec.diseases.includes(d)),
    ),
    "desc",
  );
  const showEarlier =
    person?.answers.chronicIllness === false && rule?.discussEarlier === true;
  const doctorChoice =
    rec.status === "discuss" ||
    decision?.kind === "doctor_recommends" ||
    decision?.kind === "doctor_not_applicable";
  const hiddenDecision =
    decision?.kind === "declined" || decision?.kind === "not_needed"
      ? decision
      : undefined;
  // Ausblenden nur, wenn etwas ansteht: nicht bei grünen und grauen Einträgen.
  const canHide =
    rec.status === "overdue" ||
    rec.status === "due" ||
    rec.status === "soon" ||
    rec.status === "discuss";

  const run = (fn: () => Promise<unknown>) => {
    setFailed(false);
    fn().catch(() => setFailed(true));
  };
  const { source } = rec;
  const status = statusText(rec, "day");

  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {T.rec.names[rec.id] ?? rec.id}
        </h1>
        {status && <p className="text-muted-foreground">{status}</p>}
        {change && (
          <p className="text-muted-foreground">
            {D.validSince(formatDate(change.validSince, "day"))}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{D.why}</h2>
        <ReasonSentence rec={rec} />
        {showEarlier && <p>{D.earlierWithIllness}</p>}
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{D.source}</h2>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-11 py-2 underline"
        >
          {D.sourceLine(
            source.edition,
            formatDate(source.date, "day"),
            source.section,
            source.page,
          )}
        </a>
      </section>

      {doctorChoice && <DoctorAnswer rec={rec} decision={decision} run={run} />}

      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{D.entered}</h2>
        {related.length === 0 ? (
          <p className="text-muted-foreground">{D.noneEntered}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {related.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/impfungen/${v.id}`}
                  className="flex min-h-11 items-center py-2"
                >
                  {vaccinationName(v)}, {formatDate(v.date, v.datePrecision)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(hiddenDecision || canHide) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{D.decisions}</h2>
          {hiddenDecision ? (
            <>
              <p>
                {hiddenDecision.kind === "declined"
                  ? D.declinedText
                  : T.overview.notNeeded(hiddenDecision.reason)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => run(() => actions.deleteDecision(rec.id))}
              >
                {D.showAgain}
              </Button>
            </>
          ) : askReason ? (
            <NotNeededForm
              onCancel={() => setAskReason(false)}
              onSave={(reason) => {
                setAskReason(false);
                run(() =>
                  actions.saveDecision({
                    recommendationId: rec.id,
                    kind: "not_needed",
                    reason,
                  }),
                );
              }}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  run(() =>
                    actions.saveDecision({
                      recommendationId: rec.id,
                      kind: "declined",
                    }),
                  )
                }
              >
                {D.wantNot}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAskReason(true)}
              >
                {D.notNeeded}
              </Button>
            </div>
          )}
        </section>
      )}

      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
    </div>
  );
}
