import type { Plugin } from "vite";

/**
 * Strikte Content-Security-Policy: nur eigene Quellen, keine Inline-Skripte,
 * keine Verbindungen zu Dritten.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/**
 * Setzt die CSP als meta-Tag in index.html. Nur beim Build, weil der
 * Dev-Server Inline-Skripte braucht.
 */
export function cspPlugin(): Plugin {
  return {
    name: "impfpass-csp",
    apply: "build",
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}
