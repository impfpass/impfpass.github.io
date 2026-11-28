import { useEffect, useState } from "react";

export type Loaded<T> =
  { status: "loading" } | { status: "failed" } | { status: "ready"; value: T };

/**
 * Lädt einmal beim Anzeigen (und neu, wenn sich `load` ändert). Ergebnisse,
 * die nach dem Verlassen der Seite ankommen, werden verworfen.
 */
export function useLoaded<T>(load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    let active = true;
    load().then(
      (value) => {
        if (active) setState({ status: "ready", value });
      },
      () => {
        if (active) setState({ status: "failed" });
      },
    );
    return () => {
      active = false;
    };
  }, [load]);
  return state;
}
