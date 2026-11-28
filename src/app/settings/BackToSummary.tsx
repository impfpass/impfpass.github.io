import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { T } from "@/texts";

/** Zurück zur Übersicht „Verwendete Software“. */
export function BackToSummary() {
  return (
    <Link
      href="/einstellungen/info/lizenzen"
      className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
      {T.licenseScreen.title}
    </Link>
  );
}
