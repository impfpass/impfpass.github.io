import { Button } from "@/components/ui/button";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

export function TbeQuestion() {
  const { person, actions } = useAppData();
  const Q = T.overview.tbe;
  if (!person) return null;
  const retry = () => {
    // Die Frage bleibt stehen; ein neuer Tipp versucht es noch einmal.
  };
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <p>{Q.question}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            void actions
              .updatePerson({
                ...person,
                answers: { ...person.answers, fsme: "yes" },
              })
              .catch(retry)
          }
        >
          {Q.yes}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            void actions
              .saveDecision({ recommendationId: "tbe", kind: "declined" })
              .catch(retry)
          }
        >
          {Q.no}
        </Button>
      </div>
    </section>
  );
}
