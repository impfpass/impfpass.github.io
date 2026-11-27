// Der Kern ist für Handy- und PC-App gemeinsam und hängt nicht an der Oberfläche.
const sources = import.meta.glob<string>(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

// Erfasst `from "x"` und `import "x"`.
const FORBIDDEN =
  /(?:from|import)\s+["'](@\/app\/|@\/components\/|(\.\.\/)+app\/|(\.\.\/)+components\/|react(-dom)?(\/[^"']*)?["'])/;

it("der Kern importiert nichts aus src/app, src/components, react oder react-dom", () => {
  const offenders = Object.entries(sources)
    .filter(([, code]) => FORBIDDEN.test(code))
    .map(([file]) => file);
  expect(Object.keys(sources).length).toBeGreaterThan(5);
  expect(offenders).toEqual([]);
});
