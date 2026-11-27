import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Notice } from "@/core/model";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

export function NoticeBanner({ notices }: { notices: Notice[] }) {
  const { actions } = useAppData();
  const N = T.overview.notice;
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-accent p-4">
      <ul className="flex flex-col gap-3">
        {notices.map((n) => {
          const text =
            n.text ?? T.rec.names[n.recommendationId] ?? n.recommendationId;
          return (
            <li
              key={`${n.kind}-${n.recommendationId}`}
              className="flex flex-col"
            >
              <span>{N[n.kind](text)}</span>
              {n.kind !== "dropped" && (
                <Link
                  href={`/empfehlungen/${n.recommendationId}`}
                  className="flex min-h-11 items-center self-start underline"
                >
                  {N.view}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        className="self-start"
        onClick={() =>
          void actions.dismissNotices().catch(() => {
            // Die Hinweise bleiben stehen; ein neuer Tipp versucht es noch einmal.
          })
        }
      >
        {N.dismiss}
      </Button>
    </section>
  );
}
