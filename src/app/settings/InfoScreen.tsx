import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { RULEBOOK } from "@/core/rules/rulebook";
import { T } from "@/texts";

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
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{T.info.rules}</h2>
        <p>{T.info.edition(RULEBOOK.edition)}</p>
        <p>{T.info.rulebook(RULEBOOK.version)}</p>
        <h3 className="font-semibold">{T.info.sources}</h3>
        <ul className="flex flex-col gap-1">
          {RULEBOOK.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p>{T.info.derived}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{T.licenses.title}</h2>
        <p>{T.licenses.text}</p>
        <a
          href="/third-party-licenses.txt"
          className="inline-flex min-h-11 items-center self-start underline"
        >
          {T.licenses.link}
        </a>
      </section>
      <p className="text-muted-foreground">
        {T.info.version(import.meta.env.VITE_APP_VERSION)}
      </p>
    </div>
  );
}
