import { createBackup } from "@/core/formats/backup";
import { DEFAULT_SETTINGS } from "@/core/model";
import { testPerson, testVaccination } from "@/test/helpers";
import { saveBackupFile } from "./saveBackup";

const now = new Date("2026-11-26T14:00:00Z");
const backup = createBackup(
  {
    persons: [testPerson()],
    vaccinations: [testVaccination()],
    decisions: [],
    settings: DEFAULT_SETTINGS,
  },
  now,
);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubDownload() {
  const createObjectURL = vi.fn(() => "blob:impfpass");
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
  return { clicked, createObjectURL };
}

it("teilt die Datei, wenn der Browser Dateien teilen kann", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { canShare: () => true, share });

  expect(await saveBackupFile(backup, now)).toBe("shared");

  const file: File = share.mock.calls[0][0].files[0];
  expect(file.name).toBe("impfpass-sicherung-2026-11-26.json");
  expect(JSON.parse(await file.text())).toEqual(backup);
});

it("Abbruch im Teilen-Menü ergibt cancelled", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("abgebrochen", "AbortError"));
  vi.stubGlobal("navigator", { canShare: () => true, share });
  const { clicked } = stubDownload();

  expect(await saveBackupFile(backup, now)).toBe("cancelled");
  expect(clicked).toHaveLength(0);
});

it("lädt herunter, wenn Teilen nicht geht", async () => {
  vi.stubGlobal("navigator", {});
  const { clicked } = stubDownload();

  expect(await saveBackupFile(backup, now)).toBe("downloaded");
  expect(clicked).toHaveLength(1);
  expect(clicked[0].download).toBe("impfpass-sicherung-2026-11-26.json");
  expect(clicked[0].href).toBe("blob:impfpass");
});

it("lädt herunter, wenn das Teilen aus anderem Grund scheitert", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("nicht erlaubt", "NotAllowedError"));
  vi.stubGlobal("navigator", { canShare: () => true, share });
  const { clicked } = stubDownload();

  expect(await saveBackupFile(backup, now)).toBe("downloaded");
  expect(clicked).toHaveLength(1);
});
