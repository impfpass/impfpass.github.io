import { saveFile } from "./saveFile";

const file = new File(["inhalt"], "datei.txt", { type: "text/plain" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubDownload() {
  const createObjectURL = vi.fn(() => "blob:datei");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL, revokeObjectURL }),
  );
  const clicked: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
  return { clicked };
}

it("teilt die Datei, wenn der Browser Dateien teilen kann", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { canShare: () => true, share });

  expect(await saveFile(file)).toBe("shared");
  expect(share.mock.calls[0][0]).toEqual({ files: [file], title: "datei.txt" });
});

it("Abbruch im Teilen-Menü ergibt cancelled", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("abgebrochen", "AbortError"));
  vi.stubGlobal("navigator", { canShare: () => true, share });
  const { clicked } = stubDownload();

  expect(await saveFile(file)).toBe("cancelled");
  expect(clicked).toHaveLength(0);
});

it("lädt herunter, wenn Teilen nicht geht", async () => {
  vi.stubGlobal("navigator", {});
  const { clicked } = stubDownload();

  expect(await saveFile(file)).toBe("downloaded");
  expect(clicked).toHaveLength(1);
  expect(clicked[0].download).toBe("datei.txt");
  expect(clicked[0].href).toBe("blob:datei");
});

it("lädt herunter, wenn das Teilen aus anderem Grund scheitert", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("nicht erlaubt", "NotAllowedError"));
  vi.stubGlobal("navigator", { canShare: () => true, share });
  const { clicked } = stubDownload();

  expect(await saveFile(file)).toBe("downloaded");
  expect(clicked).toHaveLength(1);
});

it("ruft mit preferShare false navigator.share nicht auf", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const canShare = vi.fn(() => true);
  vi.stubGlobal("navigator", { canShare, share });
  const { clicked } = stubDownload();

  expect(await saveFile(file, { preferShare: false })).toBe("downloaded");
  expect(share).not.toHaveBeenCalled();
  expect(clicked).toHaveLength(1);
});
