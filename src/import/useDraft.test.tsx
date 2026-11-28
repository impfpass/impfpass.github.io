import { act, renderHook, waitFor } from "@testing-library/react";
import { emptyDraft, newRow, type Draft } from "@/core/import/draft";
import { openDraftStore, type DraftStore } from "@/core/storage/draftStore";
import { useDraft } from "./useDraft";

const stored = (): Draft => ({
  ...emptyDraft(new Date("2026-11-20T10:00:00Z")),
  birthDate: "01.03.1967",
  rows: [newRow("r1")],
});

afterEach(() => {
  vi.useRealTimers();
});

it("lädt einen gespeicherten Entwurf", async () => {
  await (await openDraftStore()).save(stored());
  const { result } = renderHook(() => useDraft());
  expect(result.current.status).toBe("loading");
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.draft).toEqual(stored());
  expect(result.current.persistent).toBe(true);
});

it("speichert eine Änderung 500 ms nach der letzten", async () => {
  const store = await openDraftStore();
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  act(() => result.current.update((d) => ({ ...d, birthDate: "01.03.1967" })));
  expect(result.current.draft.birthDate).toBe("01.03.1967");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(await store.load()).toBeNull();
  act(() => result.current.update((d) => ({ ...d, birthDate: "02.03.1967" })));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
  expect(await store.load()).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
  expect((await store.load())?.birthDate).toBe("02.03.1967");
});

it("speichert sofort, wenn die Seite verborgen wird", async () => {
  const store = await openDraftStore();
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  act(() => result.current.update((d) => ({ ...d, birthDate: "x" })));
  act(() => {
    window.dispatchEvent(new Event("pagehide"));
  });
  await waitFor(async () => expect((await store.load())?.birthDate).toBe("x"));
});

it("speichert sofort bei visibilitychange auf hidden", async () => {
  const store = await openDraftStore();
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  act(() => result.current.update((d) => ({ ...d, birthDate: "y" })));
  const spy = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  spy.mockRestore();
  await waitFor(async () => expect((await store.load())?.birthDate).toBe("y"));
});

it("setzt updatedAt bei einer Änderung neu", async () => {
  const store = await openDraftStore();
  await store.save(stored());
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  act(() => result.current.update((d) => d));
  expect(result.current.draft.updatedAt).not.toBe(stored().updatedAt);
});

it("ergibt bei ungültigem Eintrag einen leeren Entwurf", async () => {
  await (await openDraftStore()).save({ version: 1 } as unknown as Draft);
  const { result } = renderHook(() => useDraft());
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.draft.rows).toEqual([]);
  expect(result.current.persistent).toBe(true);
});

it("arbeitet im Speicher weiter, wenn open scheitert", async () => {
  const { result } = renderHook(() =>
    useDraft(() => Promise.reject(new Error("kein Speicher"))),
  );
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.persistent).toBe(false);
  act(() => result.current.update((d) => ({ ...d, birthDate: "z" })));
  expect(result.current.draft.birthDate).toBe("z");
});

it("arbeitet im Speicher weiter, wenn load scheitert", async () => {
  const store: DraftStore = {
    load: () => Promise.reject(new Error("kaputt")),
    save: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  };
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.persistent).toBe(false);
});

it("meldet nach einem gescheiterten Speichern wieder Erfolg, wenn das nächste klappt", async () => {
  const save = vi
    .fn<DraftStore["save"]>()
    .mockRejectedValueOnce(new Error("voll"))
    .mockResolvedValue(undefined);
  const store: DraftStore = {
    load: () => Promise.resolve(null),
    save,
    clear: () => Promise.resolve(),
  };
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

  act(() => result.current.update((d) => ({ ...d, birthDate: "a" })));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current.persistent).toBe(false);

  act(() => result.current.update((d) => ({ ...d, birthDate: "b" })));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(save).toHaveBeenCalledTimes(2);
  expect(result.current.persistent).toBe(true);
});

it("bleibt ohne Speicher bei der Warnung, auch nach Änderungen", async () => {
  const { result } = renderHook(() =>
    useDraft(() => Promise.reject(new Error("kein Speicher"))),
  );
  await waitFor(() => expect(result.current.status).toBe("ready"));
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  act(() => result.current.update((d) => ({ ...d, birthDate: "z" })));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(result.current.persistent).toBe(false);
});

it("clear leert Entwurf und Speicher", async () => {
  const store = await openDraftStore();
  await store.save(stored());
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(() => result.current.clear());
  expect(result.current.draft.rows).toEqual([]);
  expect(await store.load()).toBeNull();
});

it("clear während eines ausstehenden Speicherns verwirft die Änderung", async () => {
  const store = await openDraftStore();
  await store.save(stored());
  const { result } = renderHook(() => useDraft(async () => store));
  await waitFor(() => expect(result.current.status).toBe("ready"));
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  act(() => result.current.update((d) => ({ ...d, birthDate: "neu" })));
  await act(async () => {
    await result.current.clear();
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(await store.load()).toBeNull();
  expect(result.current.draft.birthDate).toBe("");
});

describe("Abbau", () => {
  it("speichert beim Entfernen der Ansicht sofort eine ausstehende Änderung", async () => {
    const store = await openDraftStore();
    const save = vi.spyOn(store, "save");
    const { result, unmount } = renderHook(() => useDraft(async () => store));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.update((d) => ({ ...d, birthDate: "weg" })));
    expect(save).not.toHaveBeenCalled();
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].birthDate).toBe("weg");
  });

  it("entfernt die Listener für pagehide und visibilitychange", async () => {
    const store = await openDraftStore();
    const { result, unmount } = renderHook(() => useDraft(async () => store));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const onDocument = vi.spyOn(document, "removeEventListener");
    const onWindow = vi.spyOn(window, "removeEventListener");
    unmount();
    const pageHide = onWindow.mock.calls.find(([type]) => type === "pagehide");
    const visibility = onDocument.mock.calls.find(
      ([type]) => type === "visibilitychange",
    );
    expect(pageHide).toBeTruthy();
    expect(visibility).toBeTruthy();
    // Dieselbe Funktion, die vorher angemeldet wurde.
    const save = vi.spyOn(store, "save");
    window.dispatchEvent(new Event("pagehide"));
    expect(save).not.toHaveBeenCalled();
  });
});
