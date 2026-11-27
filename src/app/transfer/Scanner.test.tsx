import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Scanner } from "./Scanner";

const DENIED =
  "ImpfPass darf die Kamera nicht benutzen. Erlaube den Zugriff in den Einstellungen des Handys, oder übertrag die Impfungen als Datei oder Text.";
const MISSING =
  "Keine Kamera gefunden. Übertrag die Impfungen als Datei oder Text.";
const HELP = "Halte die Kamera auf den Code am PC-Bildschirm.";

function stubCamera(getUserMedia: unknown) {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: getUserMedia === undefined ? undefined : { getUserMedia },
  });
}

function fakeStream() {
  const stops = [vi.fn(), vi.fn()];
  const stream = { getTracks: () => stops.map((stop) => ({ stop })) };
  return { stream, stops };
}

function rejectWith(name: string) {
  return vi.fn().mockRejectedValue(Object.assign(new Error(name), { name }));
}

function setVisibility(state: "hidden" | "visible") {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([["NotAllowedError"], ["SecurityError"]])(
  "%s zeigt die Meldung zur Berechtigung und beide Auswege",
  async (name) => {
    stubCamera(rejectWith(name));
    const onFallback = vi.fn();
    const user = userEvent.setup();
    render(<Scanner onCode={vi.fn()} onFallback={onFallback} />);

    expect((await screen.findByRole("alert")).textContent).toBe(DENIED);
    await user.click(screen.getByRole("button", { name: "Datei öffnen" }));
    await user.click(screen.getByRole("button", { name: "Text einfügen" }));
    expect(onFallback.mock.calls).toEqual([["file"], ["text"]]);
  },
);

it.each([["NotFoundError"], ["OverconstrainedError"]])(
  "%s meldet, dass keine Kamera da ist",
  async (name) => {
    stubCamera(rejectWith(name));
    render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toBe(MISSING);
    expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Text einfügen" })).toBeTruthy();
  },
);

it("ohne navigator.mediaDevices meldet es die fehlende Kamera", async () => {
  stubCamera(undefined);
  render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe(MISSING);
});

it("andere Fehler melden, dass die Kamera nicht startet", async () => {
  stubCamera(rejectWith("AbortError"));
  render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Kamera lässt sich nicht starten.",
  );
});

it("fragt die Rückkamera an und zeigt Bild und Hilfetext", async () => {
  const { stream } = fakeStream();
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  stubCamera(getUserMedia);
  render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);

  expect(await screen.findByText(HELP)).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledWith({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  const video = screen.getByLabelText("Kamerabild") as HTMLVideoElement;
  expect(video.playsInline).toBe(true);
  expect(video.muted).toBe(true);
  expect(video.autoplay).toBe(true);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("stoppt beim Verlassen alle Spuren", async () => {
  const { stream, stops } = fakeStream();
  stubCamera(vi.fn().mockResolvedValue(stream));
  const { unmount } = render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  await screen.findByText(HELP);
  expect(stops[0]).not.toHaveBeenCalled();

  unmount();

  expect(stops[0]).toHaveBeenCalledOnce();
  expect(stops[1]).toHaveBeenCalledOnce();
});

it("stoppt im Hintergrund und startet beim Zurückkehren neu", async () => {
  const first = fakeStream();
  const second = fakeStream();
  const getUserMedia = vi
    .fn()
    .mockResolvedValueOnce(first.stream)
    .mockResolvedValueOnce(second.stream);
  stubCamera(getUserMedia);
  const { unmount } = render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  await screen.findByText(HELP);

  act(() => setVisibility("hidden"));
  expect(first.stops[0]).toHaveBeenCalledOnce();
  expect(first.stops[1]).toHaveBeenCalledOnce();

  await act(async () => setVisibility("visible"));
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(second.stops[0]).not.toHaveBeenCalled();

  unmount();
  expect(second.stops[0]).toHaveBeenCalledOnce();
});

it("stoppt einen Stream, der erst nach dem Verlassen ankommt", async () => {
  const { stream, stops } = fakeStream();
  let resolve: (s: unknown) => void = () => {};
  stubCamera(vi.fn().mockReturnValue(new Promise((r) => (resolve = r))));
  const { unmount } = render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);

  unmount();
  await act(async () => resolve(stream));

  expect(stops[0]).toHaveBeenCalledOnce();
});
