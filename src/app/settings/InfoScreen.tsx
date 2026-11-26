import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { T } from "../texts";

export function InfoScreen() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/einstellungen"
        className="flex min-h-11 items-center gap-1 self-start text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        {T.settings.title}
      </Link>
      <h1 className="text-2xl font-semibold">{T.info.title}</h1>
      <p>{T.info.notMedicalAdvice}</p>
      <p>{T.info.privacy}</p>
      <p>{T.info.backup}</p>
      <p className="text-muted-foreground">
        {T.info.version(import.meta.env.VITE_APP_VERSION)}
      </p>
    </div>
  );
}
