import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RULEBOOK } from "@/core/rules/rulebook";
import type { Recommendation } from "@/core/rules/types";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

/** Begründung einer „Mit dem Arzt besprechen“-Empfehlung, auch im Detail. */
export function DiscussReason({ rec }: { rec: Recommendation }) {
  const rule = RULEBOOK.rules.find((r) => r.id === rec.id);
  const normalAge = rec.reason.kind === "discuss" ? rec.reason.normalAge : null;
  const serology =
    rec.reason.kind === "discuss" && rec.reason.topic === "serology";
  const D = T.overview.discuss;
  return (
    <>
      <p>{normalAge === null ? D.noNormal : D.normalAge(normalAge)}</p>
      {serology && <p>{D.serology}</p>}
      {rule?.discussTargetGroup && (
        <p>{D.targetGroup(rule.discussTargetGroup)}</p>
      )}
    </>
  );
}

export function DiscussCard({ rec }: { rec: Recommendation }) {
  const { actions } = useAppData();
  const D = T.overview.discuss;
  const [failed, setFailed] = useState(false);

  const decide = (kind: "doctor_recommends" | "doctor_not_applicable") => {
    setFailed(false);
    actions
      .saveDecision({ recommendationId: rec.id, kind })
      .catch(() => setFailed(true));
  };

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-4">
      <p className="font-medium">{T.rec.names[rec.id] ?? rec.id}</p>
      <DiscussReason rec={rec} />
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => decide("doctor_recommends")}>
          {D.doctorRecommends}
        </Button>
        <Button
          variant="outline"
          onClick={() => decide("doctor_not_applicable")}
        >
          {D.notApplicable}
        </Button>
      </div>
    </li>
  );
}
