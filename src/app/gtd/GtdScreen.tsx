import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/core/dates";
import { gtdAddress, gtdLink, gtdText } from "@/core/formats/gtd";
import { buildPayload, type GtdChanges } from "@/core/gtd/handover";
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
  const { changes, reminders } = gtd;
  const [message, setMessage] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [manual, setManual] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Zeitpunkt der Übergabe: wann die Seite geöffnet wurde.
  const [now] = useState(() => new Date());

  const pending = changes.upserts.length + changes.cancels.length > 0;
  // Ist alles übergeben, lässt sich alles noch einmal schicken, etwa wenn der
  // Link bei der Anmeldung in der GTD-App seine Daten verloren hat. Das
  // schadet nicht, die GTD-App erkennt doppelte refs (Spec 9.2).
  const resend = useMemo<GtdChanges>(
    () => ({ upserts: reminders, cancels: [] }),
    [reminders],
  );
  const toSend = pending ? changes : resend;
  // Link und Text tragen genau die Änderungen, die danach als übergeben gelten.
  const payload = useMemo(
    () => buildPayload(toSend, today, now),
    [toSend, today, now],
  );
  const address = gtdAddress(settings);
  // Packen nur, wenn sich die Daten ändern, nicht bei jedem Zeichnen.
  const text = useMemo(() => gtdText(payload), [payload]);
  const link = useMemo(
    () => (address ? gtdLink(address, payload) : ""),
    [address, payload],
  );

  // Fokus und Markierung über setSelectionRange: Safari auf dem iPhone
  // ignoriert select() oft, wenn es nicht direkt aus einem Tippen kommt.
  useEffect(() => {
    const field = textRef.current;
    if (!manual || !field) return;
    field.focus();
    field.setSelectionRange(0, field.value.length);
  }, [manual]);

  /** Nach Link oder Kopieren; nur offene Änderungen gelten danach als übergeben. */
  async function done(confirmation: string) {
    setSaveFailed(false);
    try {
      if (pending) await actions.markHandedOver(changes);
      setManual(false);
      setMessage(confirmation);
    } catch {
      setSaveFailed(true);
    }
  }

  async function copy() {
    setMessage(null);
    if (await copyText(text, textRef.current)) await done(G.copied);
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
  } else if (!pending && reminders.length === 0) {
    body = <p>{G.upToDate}</p>;
  } else {
    body = (
      <>
        {!pending && (
          <>
            <p>{G.upToDate}</p>
            <p>{G.resend}</p>
          </>
        )}
        <p>{G.intro(new URL(address).host)}</p>
        {pending && changes.upserts.length > 0 && (
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
        {pending && changes.cancels.length > 0 && (
          <p>{G.cancels(changes.cancels.length)}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={() => void done(G.opened)}
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
              onClick={() => void done(G.copied)}
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
