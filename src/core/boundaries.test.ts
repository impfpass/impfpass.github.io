import { posix } from "node:path";

// Pfade sind relativ zu src/core/. Der Kern ist für Handy- und PC-App
// gemeinsam und hängt nicht an der Oberfläche.
const coreSources = import.meta.glob<string>(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
// PC-App (src/import) und Handy-App (src/app) kennen einander nicht.
const importSources = import.meta.glob<string>(
  ["../import/**/*.{ts,tsx}", "!../import/**/*.test.{ts,tsx}"],
  { query: "?raw", import: "default", eager: true },
);
const appSources = import.meta.glob<string>(
  ["../app/**/*.{ts,tsx}", "!../app/**/*.test.{ts,tsx}"],
  { query: "?raw", import: "default", eager: true },
);

// Erfasst `from "x"`, `import "x"` und `import("x")`.
const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(?\s*)["']([^"']+)["']/g;

/** Alle Importziele einer Datei, als Pfad relativ zu src/core/ (`@/` = src/). */
function targets(file: string, code: string): string[] {
  return [...code.matchAll(SPECIFIER)].map(([, spec]) => {
    if (spec.startsWith("@/")) return posix.join("..", spec.slice(2));
    if (spec.startsWith(".")) return posix.join(posix.dirname(file), spec);
    return spec; // Paket
  });
}

const startsWithDir = (target: string, dir: string) =>
  target === dir || target.startsWith(`${dir}/`);

function offenders(
  sources: Record<string, string>,
  forbidden: (target: string) => boolean,
) {
  return Object.entries(sources)
    .filter(([file, code]) => targets(file, code).some(forbidden))
    .map(([file]) => file);
}

it("die Suche findet statische und dynamische Importe, aber keine Aufrufe von from", () => {
  const code = `
    import { a } from "./a";
    import "./side";
    export * from '../b';
    const m = await import("@/c");
    const n = import( './d' );
    const text = Array.from("nicht-ein-import");
  `;
  expect(targets("./x/y.ts", code)).toEqual([
    "x/a",
    "x/side",
    "b",
    "../c",
    "x/d",
  ]);
});

it("der Kern importiert nichts aus src/app, src/import, src/components, react oder react-dom", () => {
  expect(Object.keys(coreSources).length).toBeGreaterThan(5);
  expect(
    offenders(
      coreSources,
      (t) =>
        startsWithDir(t, "../app") ||
        startsWithDir(t, "../import") ||
        startsWithDir(t, "../components") ||
        startsWithDir(t, "react") ||
        startsWithDir(t, "react-dom"),
    ),
  ).toEqual([]);
});

it("die PC-App (src/import) importiert nichts aus src/app", () => {
  expect(Object.keys(importSources)).toEqual(
    expect.arrayContaining(["../import/main.tsx", "../import/ImportApp.tsx"]),
  );
  expect(offenders(importSources, (t) => startsWithDir(t, "../app"))).toEqual(
    [],
  );
});

it("die Handy-App (src/app) importiert nichts aus src/import", () => {
  expect(Object.keys(appSources).length).toBeGreaterThan(5);
  expect(offenders(appSources, (t) => startsWithDir(t, "../import"))).toEqual(
    [],
  );
});

it("nur die Handy-App übergibt ans GTD: src/import nutzt weder src/core/gtd noch das GTD-Format", () => {
  const gtd = (t: string) =>
    startsWithDir(t, "../core/gtd") || t === "../core/formats/gtd";
  // Gegenprobe: ein solcher Import würde gefunden.
  expect(
    offenders(
      {
        "../import/x.tsx":
          'import { remindersFor } from "@/core/gtd/reminders";',
        "../import/y.tsx": 'import { gtdText } from "../core/formats/gtd";',
      },
      gtd,
    ),
  ).toEqual(["../import/x.tsx", "../import/y.tsx"]);
  expect(offenders(importSources, gtd)).toEqual([]);
});
