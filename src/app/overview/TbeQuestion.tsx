import { useState } from "react";
import { Button } from "@/components/ui/button";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

export function TbeQuestion() {
  const { person, actions } = useAppData();
  const Q = T.overview.tbe;
  const [failed, setFailed] = useState(false);
  if (!person) return null;
  const run = (action: Promise<void>) => {
    setFailed(false);
    action.catch(() => setFailed(true));
  };
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <p>{Q.question}</p>
      {failed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            run(
              actions.updatePerson({
                ...person,
                answers: { ...person.answers, fsme: "yes" },
              }),
            )
          }
        >
          {Q.yes}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            run(
              actions.saveDecision({
                recommendationId: "tbe",
                kind: "declined",
              }),
            )
          }
        >
          {Q.no}
        </Button>
      </div>
    </section>
  );
}
