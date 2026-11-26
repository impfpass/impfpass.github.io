import type { Plugin } from "vite";
import { T } from "../src/app/texts.ts";

/**
 * Schlichtes CSS ohne Tailwind (das ältere Safari teils nicht versteht). Der
 * Hinweis auf einen zu alten Browser wird erst nach 10 Sekunden sichtbar.
 */
export const BOOT_STYLE = [
  ".boot{font:1.125rem/1.5 system-ui,sans-serif;max-width:36rem;margin:0 auto;padding:2rem 1.5rem}",
  ".boot-late{visibility:hidden;animation:boot-late 0s 10s forwards}",
  "@keyframes boot-late{to{visibility:visible}}",
  "@media (prefers-color-scheme:dark){html{background:#0a0a0a;color:#fafafa}}",
].join("\n");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROOT = '<div id="root"></div>';

/**
 * Setzt eine Startmeldung in #root. React ersetzt sie beim Start. Kann der
 * Browser das Skript nicht ausführen (iOS vor 16.4), bleibt sie stehen, und
 * nach einer Weile erscheint der Hinweis auf den zu alten Browser. So gibt es
 * nie eine weiße Seite, und das ganz ohne Inline-Skript (CSP).
 */
export function bootFallbackPlugin(): Plugin {
  return {
    name: "impfpass-boot-fallback",
    transformIndexHtml: {
      order: "pre",
      handler(html: string) {
        if (!html.includes(ROOT)) {
          throw new Error(`index.html braucht ${ROOT}`);
        }
        const fallback =
          `<div class="boot"><p>${escapeHtml(T.boot.loading)}</p>` +
          `<p class="boot-late">${escapeHtml(T.boot.tooOld)}</p></div>`;
        return {
          html: html.replace(ROOT, `<div id="root">${fallback}</div>`),
          tags: [{ tag: "style", children: BOOT_STYLE, injectTo: "head" }],
        };
      },
    },
  };
}
