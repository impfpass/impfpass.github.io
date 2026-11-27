import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { T } from "@/texts";
import { fitWithin, isRepeat, scanFrame } from "./scanFrame";

const SCAN_INTERVAL_MS = 250;
const MAX_EDGE = 960;
const DEDUP_MS = 2000;
const MAX_FAILURES = 10;

function errorMessage(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return T.transfer.scanner.denied;
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return T.transfer.scanner.missing;
  }
  return T.transfer.scanner.failed;
}

/**
 * Liest QR-Codes mit der Kamera. Die Kamera läuft nur, solange die Komponente
 * eingebunden und die App sichtbar ist.
 */
export function Scanner({
  onCode,
  onFallback,
}: {
  onCode(text: string): void;
  onFallback(way: "file" | "text"): void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  const [error, setError] = useState<string | null>(null);
  // Jeder Versuch startet die Kamera neu, siehe „Noch einmal versuchen“.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let starting = false;
    let unmounted = false;
    let canvas: HTMLCanvasElement | null = null;
    let last = { text: "", at: 0 };
    let failures = 0;

    function stop() {
      clearInterval(timer);
      timer = undefined;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (video.current) video.current.srcObject = null;
    }

    function scanOnce() {
      const el = video.current;
      if (!el || el.readyState < 2 || !el.videoWidth || !el.videoHeight) return;
      const { width, height } = fitWithin(
        el.videoWidth,
        el.videoHeight,
        MAX_EDGE,
      );
      canvas ??= document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(el, 0, 0, width, height);
      const text = scanFrame(ctx.getImageData(0, 0, width, height));
      if (text === null) return;
      const now = Date.now();
      if (isRepeat(last, text, now, DEDUP_MS)) return;
      last = { text, at: now };
      onCodeRef.current(text);
    }

    function tick() {
      try {
        scanOnce();
        failures = 0;
      } catch {
        // Ein einzelnes Bild darf scheitern; bleibt es dabei, geben wir auf.
        failures += 1;
        if (failures >= MAX_FAILURES) {
          stop();
          setError(T.transfer.scanner.failed);
        }
      }
    }

    async function start() {
      if (stream || starting || unmounted) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(T.transfer.scanner.missing);
        return;
      }
      starting = true;
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (unmounted || document.visibilityState === "hidden") {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
        timer = setInterval(tick, SCAN_INTERVAL_MS);
        setError(null);
      } catch (e) {
        if (!unmounted) setError(errorMessage(e));
      } finally {
        starting = false;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") stop();
      else void start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    void start();
    return () => {
      unmounted = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [attempt]);

  function retry() {
    setError(null);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <video
        ref={video}
        aria-label={T.transfer.scanner.videoLabel}
        playsInline
        muted
        autoPlay
        className={
          error
            ? "hidden"
            : "max-h-[60vh] w-full rounded-md bg-black object-contain"
        }
      />
      {error ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={retry}
            >
              {T.transfer.scanner.retry}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onFallback("file")}
            >
              {T.transfer.openFile}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onFallback("text")}
            >
              {T.transfer.pasteText}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">{T.transfer.scanner.help}</p>
      )}
    </div>
  );
}
