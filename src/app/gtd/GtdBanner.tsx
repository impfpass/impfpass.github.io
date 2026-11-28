import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

/**
 * Hinweis auf Erinnerungen, die noch nicht im GTD sind (Spec 6.1, 9.2).
 * Ohne Adresse der GTD-App ist die Übergabe ausgeschaltet.
 */
export function GtdBanner() {
  const { settings, gtd } = useAppData();
  const n = gtd.changes.upserts.length + gtd.changes.cancels.length;
  if (!settings.gtdUrl || n === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <p>{T.gtd.pending(n)}</p>
      <Button asChild className="self-start">
        <Link href="/gtd">{T.gtd.open}</Link>
      </Button>
    </section>
  );
}
