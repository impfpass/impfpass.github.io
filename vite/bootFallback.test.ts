import { expect, it } from "vitest";
import { T } from "../src/texts";
import { BOOT_STYLE, bootFallbackPlugin } from "./bootFallback";

type Hook = (html: string) => {
  html: string;
  tags: { tag: string; children?: string; injectTo?: string }[];
};

function transform(html: string) {
  const hook = bootFallbackPlugin().transformIndexHtml as unknown as {
    handler: Hook;
  };
  return hook.handler(html);
}

it("füllt #root mit einer Startmeldung, die React beim Start ersetzt", () => {
  const { html } = transform('<body><div id="root"></div></body>');
  expect(html).toContain(`<div id="root"><div class="boot">`);
  expect(html).toContain(T.boot.loading);
  expect(html).toContain(T.boot.tooOld);
});

it("der Hinweis auf einen zu alten Browser erscheint erst nach einer Weile", () => {
  const { tags } = transform('<body><div id="root"></div></body>');
  expect(tags).toEqual([
    { tag: "style", children: BOOT_STYLE, injectTo: "head" },
  ]);
  expect(BOOT_STYLE).toMatch(/\.boot-late\s*\{[^}]*visibility:\s*hidden/);
  expect(BOOT_STYLE).toMatch(/animation:[^;]*\d+s forwards/);
});

it("bricht laut ab, wenn index.html kein leeres #root mehr hat", () => {
  expect(() => transform("<body></body>")).toThrow();
});
