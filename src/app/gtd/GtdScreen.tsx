import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/core/dates";
import { gtdLink, gtdText } from "@/core/formats/gtd";
import { buildPayload } from "@/core/gtd/handover";
import { copyText } from "@/lib/copyText";
import { T } from "@/texts";
import { useAppData } from "../data/AppData";

/**
 * Übergabe der Erinnerungen an die GTD-App als Link oder als Text
 * (Spec 9.2). Als übergeben gilt, was der Anwender ausgelöst hat; eine
 * Rückmeldung der GTD-App gibt es nicht.
 */
export function GtdScreen() {
  const { settings, gtd, today, actions } = useAppData();
  const G = T.gtd.screen;
  const { changes } = gtd;
  const [message, setMessage] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [manual, setManual] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Zeitpunkt der Übergabe: wann die Seite geöffnet wurde.
  const [now] = useState(() => new Date());

  // Link und Text tragen genau die Änderungen, die danach als übergeben gelten.
  const payload = useMemo(
    () => buildPayload(changes, today, now),
    [changes, today, now],
  );
  const address = settings.gtdUrl;
  const text = gtdText(payload);
  const count = changes.upserts.length + changes.cancels.length;

  useEffect(() => {
    if (manual) textRef.current?.select();
  }, [manual]);

  async function mark(done: string) {
    setSaveFailed(false);
    try {
      await actions.markHandedOver(changes);
      setManual(false);
      setMessage(done);
    } catch {
      setSaveFailed(true);
    }
  }

  async function copy() {
    setMessage(null);
    if (await copyText(text, textRef.current)) await mark(G.copied);
    else setManual(true);
  }

  let body;
  if (!address) {
    body = (
      <>
        <p>{G.noAddress}</p>
        <Link
          href="/einstellungen"
          className="flex min-h-11 items-center self-start underline"
        >
          {G.toSettings}
        </Link>
      </>
    );
  } else if (count === 0) {
    body = <p>{G.upToDate}</p>;
  } else {
    body = (
      <>
        <p>{G.intro(new URL(address).host)}</p>
        {changes.upserts.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">{G.changes}</h2>
            <ul className="flex flex-col divide-y">
              {changes.upserts.map((r) => (
                <li key={r.ref} className="flex flex-col py-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground">
                    {G.when(
                      r.day === null || r.day < today
                        ? null
                        : formatDate(r.day, "day"),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {changes.cancels.length > 0 && (
          <p>{G.cancels(changes.cancels.length)}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a
              href={gtdLink(address, payload)}
              target="_blank"
              rel="noreferrer"
              onClick={() => void mark(G.opened)}
            >
              {G.openLink}
            </a>
          </Button>
          <Button type="button" variant="outline" onClick={() => void copy()}>
            {G.copy}
          </Button>
        </div>
        <p className="text-muted-foreground">{G.iphone}</p>
        {manual && (
          <div className="flex flex-col gap-3">
            <p role="alert">{G.copyFailed}</p>
            <label className="flex flex-col gap-2">
              <span>{G.textLabel}</span>
              <textarea
                ref={textRef}
                readOnly
                value={text}
                rows={4}
                className="rounded-md border bg-transparent p-3 font-mono text-sm break-all"
              />
            </label>
            <Button
              type="button"
              className="self-start"
              onClick={() => void mark(G.copied)}
            >
              {G.copiedManually}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">{G.title}</h1>
      {body}
      {message && <p role="status">{message}</p>}
      {saveFailed && (
        <p role="alert" className="text-destructive">
          {T.common.saveFailed}
        </p>
      )}
    </div>
  );
}
