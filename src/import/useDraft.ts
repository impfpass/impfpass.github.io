import { useCallback, useEffect, useRef, useState } from "react";
import { emptyDraft, type Draft } from "@/core/import/draft";
import { openDraftStore, type DraftStore } from "@/core/storage/draftStore";

const SAVE_DELAY_MS = 500;

export interface UseDraft {
  status: "loading" | "ready";
  draft: Draft;
  /** false, wenn der Browser kein Speichern erlaubt; der Entwurf lebt dann nur im Speicher. */
  persistent: boolean;
  update(fn: (d: Draft) => Draft): void;
  clear(): Promise<void>;
}

/** Hält den Entwurf der PC-App und speichert ihn in IndexedDB (Spec 8.1). */
export function useDraft(
  open: () => Promise<DraftStore> = openDraftStore,
): UseDraft {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [persistent, setPersistent] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(new Date()));
  const draftRef = useRef(draft);
  const storeRef = useRef<DraftStore | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const openRef = useRef(open);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current || !storeRef.current) return;
    dirtyRef.current = false;
    // Klappt ein späteres Speichern wieder, verschwindet die Warnung.
    storeRef.current.save(draftRef.current).then(
      () => setPersistent(true),
      () => setPersistent(false),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await openRef.current();
        const loaded = await store.load();
        if (cancelled) return;
        storeRef.current = store;
        // Hat der Anwender schon etwas geändert, bleibt seine Änderung.
        if (loaded && !dirtyRef.current) {
          draftRef.current = loaded;
          setDraft(loaded);
        }
      } catch {
        if (!cancelled) setPersistent(false);
      }
      if (!cancelled) setStatus("ready");
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const update = useCallback(
    (fn: (d: Draft) => Draft) => {
      const next = {
        ...fn(draftRef.current),
        updatedAt: new Date().toISOString(),
      };
      draftRef.current = next;
      dirtyRef.current = true;
      setDraft(next);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const clear = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dirtyRef.current = false;
    const empty = emptyDraft(new Date());
    draftRef.current = empty;
    setDraft(empty);
    try {
      await storeRef.current?.clear();
    } catch {
      setPersistent(false);
    }
  }, []);

  return { status, draft, persistent, update, clear };
}
