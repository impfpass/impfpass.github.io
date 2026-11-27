import { copyText } from "./copyText";

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
  });
}

afterEach(() => setClipboard(undefined));

it("schreibt in die Zwischenablage und meldet true", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  expect(await copyText("Hallo")).toBe(true);
  expect(writeText).toHaveBeenCalledWith("Hallo");
});

it("markiert bei Ablehnung das Ersatzfeld und meldet false", async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("nein")) });
  const area = document.createElement("textarea");
  area.value = "Hallo Welt";
  document.body.append(area);
  expect(await copyText("Hallo Welt", area)).toBe(false);
  expect(area.selectionStart).toBe(0);
  expect(area.selectionEnd).toBe(10);
  area.remove();
});

it("meldet false ohne Zwischenablage und ohne Ersatzfeld", async () => {
  setClipboard(undefined);
  expect(await copyText("Hallo")).toBe(false);
});
