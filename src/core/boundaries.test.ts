// Der Kern ist für Handy- und PC-App gemeinsam und hängt nicht an der Oberfläche.
const sources = import.meta.glob<string>(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

it("der Kern importiert nichts aus src/app", () => {
  const offenders = Object.entries(sources)
    .filter(([, code]) => /from\s+["'](@\/app\/|(\.\.\/)+app\/)/.test(code))
    .map(([file]) => file);
  expect(Object.keys(sources).length).toBeGreaterThan(5);
  expect(offenders).toEqual([]);
});
