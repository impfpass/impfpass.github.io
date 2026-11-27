import { Button } from "@/components/ui/button";
import { RULEBOOK } from "@/core/rules/rulebook";
import type { Recommendation } from "@/core/rules/types";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

export function DiscussCard({ rec }: { rec: Recommendation }) {
  const { actions } = useAppData();
  const rule = RULEBOOK.rules.find((r) => r.id === rec.id);
  const normalAge = rec.reason.kind === "discuss" ? rec.reason.normalAge : null;
  const serology =
    rec.reason.kind === "discuss" && rec.reason.topic === "serology";
  const D = T.overview.discuss;

  const decide = (kind: "doctor_recommends" | "doctor_not_applicable") =>
    void actions.saveDecision({ recommendationId: rec.id, kind }).catch(() => {
      // Die Karte bleibt stehen; ein neuer Tipp versucht es noch einmal.
    });

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-4">
      <p className="font-medium">{T.rec.names[rec.id] ?? rec.id}</p>
      <p>{normalAge === null ? D.noNormal : D.normalAge(normalAge)}</p>
      {serology && <p>{D.serology}</p>}
      {rule?.discussTargetGroup && (
        <p>{D.targetGroup(rule.discussTargetGroup)}</p>
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
