import { shouldShowInstallHint } from "./installHintRules";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const android =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const desktop =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

it("zeigt den Hinweis auf dem iPhone im Browser", () => {
  expect(shouldShowInstallHint(iphone, false, false)).toBe(true);
});

it("nicht in der installierten App", () => {
  expect(shouldShowInstallHint(iphone, true, false)).toBe(false);
});

it("nicht nach dem Wegklicken", () => {
  expect(shouldShowInstallHint(iphone, false, true)).toBe(false);
});

it("nicht auf Android und am PC, der Text beschreibt das iPhone", () => {
  expect(shouldShowInstallHint(android, false, false)).toBe(false);
  expect(shouldShowInstallHint(desktop, false, false)).toBe(false);
});
