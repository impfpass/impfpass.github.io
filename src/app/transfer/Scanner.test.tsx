import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Scanner } from "./Scanner";
import { scanFrame } from "./scanFrame";

vi.mock("./scanFrame", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./scanFrame")>()),
  scanFrame: vi.fn(),
}));

const DENIED =
  "ImpfPass darf die Kamera nicht benutzen. Erlaube den Zugriff in den Einstellungen des Handys, oder übertrag die Impfungen als Datei oder Text.";
const MISSING =
  "Keine Kamera gefunden. Übertrag die Impfungen als Datei oder Text.";
const HELP = "Halte die Kamera auf den Code am PC-Bildschirm.";
const RETRY = "Noch einmal versuchen";

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
    expect(screen.getByRole("button", { name: RETRY })).toBeTruthy();
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
    expect(screen.getByRole("button", { name: RETRY })).toBeTruthy();
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

it("„Noch einmal versuchen“ fragt die Kamera erneut an", async () => {
  const { stream, stops } = fakeStream();
  const getUserMedia = vi
    .fn()
    .mockRejectedValueOnce(
      Object.assign(new Error("NotAllowedError"), { name: "NotAllowedError" }),
    )
    .mockResolvedValueOnce(stream);
  stubCamera(getUserMedia);
  const user = userEvent.setup();
  const { unmount } = render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toBe(DENIED);

  await user.click(screen.getByRole("button", { name: RETRY }));

  expect(await screen.findByText(HELP)).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("button", { name: RETRY })).toBeNull();
  unmount();
  expect(stops[0]).toHaveBeenCalledOnce();
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

it("„visible“ bei laufender Kamera fragt nicht erneut an, „hidden“ löst das Bild", async () => {
  const { stream } = fakeStream();
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  stubCamera(getUserMedia);
  render(<Scanner onCode={vi.fn()} onFallback={vi.fn()} />);
  await screen.findByText(HELP);
  const video = screen.getByLabelText("Kamerabild") as HTMLVideoElement;
  expect(video.srcObject).toBe(stream);

  await act(async () => setVisibility("visible"));
  expect(getUserMedia).toHaveBeenCalledOnce();
  expect(video.srcObject).toBe(stream);

  act(() => setVisibility("hidden"));
  expect(video.srcObject).toBeNull();
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

describe("Scan-Schleife", () => {
  const drawImage = vi.fn();
  const getImageData = vi.fn();

  async function startLoop(onCode = vi.fn(), readyState = 4) {
    const { stream, stops } = fakeStream();
    stubCamera(vi.fn().mockResolvedValue(stream));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
      getImageData,
    } as never);
    const view = render(<Scanner onCode={onCode} onFallback={vi.fn()} />);
    await act(async () => {});
    const video = screen.getByLabelText("Kamerabild");
    Object.defineProperty(video, "readyState", {
      value: readyState,
      configurable: true,
    });
    Object.defineProperty(video, "videoWidth", { value: 1920 });
    Object.defineProperty(video, "videoHeight", { value: 1080 });
    return { ...view, stops, video, onCode };
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    drawImage.mockReset();
    getImageData
      .mockReset()
      .mockReturnValue({ data: [], width: 960, height: 540 });
    vi.mocked(scanFrame).mockReset().mockReturnValue(null);
  });
  afterEach(() => vi.useRealTimers());

  it("liest alle 250 ms ein auf 960 px verkleinertes Bild", async () => {
    const { onCode } = await startLoop();
    vi.mocked(scanFrame).mockReturnValue("code");

    act(() => vi.advanceTimersByTime(250));

    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 960, 540]);
    expect(getImageData).toHaveBeenCalledWith(0, 0, 960, 540);
    expect(onCode).toHaveBeenCalledWith("code");
  });

  it("überspringt Bilder, solange das Video nicht bereit ist", async () => {
    const { onCode } = await startLoop(vi.fn(), 1);
    vi.mocked(scanFrame).mockReturnValue("code");

    act(() => vi.advanceTimersByTime(1000));

    expect(drawImage).not.toHaveBeenCalled();
    expect(onCode).not.toHaveBeenCalled();
  });

  it("meldet denselben Text innerhalb von 2 Sekunden nur einmal", async () => {
    const { onCode } = await startLoop();
    vi.mocked(scanFrame).mockReturnValue("code");

    act(() => vi.advanceTimersByTime(1750));
    expect(onCode).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(500));
    expect(onCode).toHaveBeenCalledTimes(2);
  });

  it("liest nach „hidden“ und nach dem Verlassen nicht mehr", async () => {
    const { unmount } = await startLoop();
    act(() => setVisibility("hidden"));
    act(() => vi.advanceTimersByTime(1000));
    expect(drawImage).not.toHaveBeenCalled();

    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("ohne 2D-Kontext wird das Bild übersprungen", async () => {
    const { onCode } = await startLoop();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    act(() => vi.advanceTimersByTime(500));
    expect(onCode).not.toHaveBeenCalled();
  });

  it("ein einzelnes fehlerhaftes Bild wird ignoriert", async () => {
    const { onCode } = await startLoop();
    getImageData.mockImplementationOnce(() => {
      throw new Error("kaputt");
    });
    vi.mocked(scanFrame).mockReturnValue("code");

    act(() => vi.advanceTimersByTime(500));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(onCode).toHaveBeenCalledTimes(1);
  });

  it("nach 10 Fehlern in Folge stoppt die Kamera und die Meldung erscheint", async () => {
    const { stops } = await startLoop();
    getImageData.mockImplementation(() => {
      throw new Error("kaputt");
    });

    act(() => vi.advanceTimersByTime(250 * 9));
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => vi.advanceTimersByTime(250));

    expect(screen.getByRole("alert").textContent).toBe(
      "Die Kamera lässt sich nicht starten.",
    );
    expect(stops[0]).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Datei öffnen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Text einfügen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: RETRY })).toBeTruthy();
    const calls = getImageData.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(getImageData.mock.calls.length).toBe(calls);
  });

  it("nach der Rückkehr aus dem Hintergrund zählen die Fehler von vorn", async () => {
    await startLoop();
    getImageData.mockImplementation(() => {
      throw new Error("kaputt");
    });
    act(() => vi.advanceTimersByTime(250 * 9));
    act(() => setVisibility("hidden"));
    await act(async () => setVisibility("visible"));

    act(() => vi.advanceTimersByTime(250 * 9));
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("alert").textContent).toBe(
      "Die Kamera lässt sich nicht starten.",
    );
  });

  it("setzt die Größe der Leinwand nur, wenn sie sich ändert", async () => {
    const width = vi.spyOn(HTMLCanvasElement.prototype, "width", "set");
    const height = vi.spyOn(HTMLCanvasElement.prototype, "height", "set");
    await startLoop();

    act(() => vi.advanceTimersByTime(1000));

    expect(drawImage).toHaveBeenCalledTimes(4);
    expect(width.mock.calls).toEqual([[960]]);
    expect(height.mock.calls).toEqual([[540]]);
  });
});
