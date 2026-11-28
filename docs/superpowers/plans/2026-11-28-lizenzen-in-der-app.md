# Lizenzen in der App – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Handy-App zeigt die verwendete Software auf eigenen Seiten: eine Übersicht nach Projekten mit Lizenz und dahinter die vollständigen Lizenztexte, beide mit Zurück-Link und unterer Leiste.

**Architecture:** Das Build-Plugin `vite/licenses.ts` fasst die Pakete anhand einer festen Liste `vite/licenseProjects.ts` zu Projekten zusammen und legt `third-party-licenses.json` neben die Textdatei. Zwei neue Seiten unter `src/app/settings/` laden JSON und Text von der eigenen Seite (vom Service Worker vorgespeichert). Die Info-Seite verlinkt die Übersicht per Hash-Route.

**Tech Stack:** wie bisher (React 19, wouter mit Hash-Routing, Vite-Plugin, vite-plugin-pwa, Vitest).

**Spec:** `docs/superpowers/specs/2026-11-28-lizenzen-in-der-app-design.md`

## Global Constraints

- Nur die genannten Dateien ändern und committen (`git add <pfad>`). Nie Branch wechseln, stashen, resetten oder amenden. Nicht pushen ohne das Ja des Users.
- Die PC-App (`src/import/`) bleibt unverändert, `T.licenses.text` und `T.licenses.link` bleiben wortgleich (der Fuß der PC-App nutzt sie).
- Alle sichtbaren Texte in `src/texts.ts`, deutsch, du-Form, sachlich, keine Gedankenstriche als Satzzeichen. Bedienflächen mindestens 44 px hoch (`min-h-11`).
- Zur Laufzeit nur Anfragen an die eigene Seite (CSP `connect-src 'self'`).
- Kern (`src/core/`) ohne React und ohne Importe aus `src/app/` oder `src/import/`.
- Dateinamen: `third-party-licenses.txt` (vorhanden) und `third-party-licenses.json` (neu), beide an der Wurzel der Seite.
- Routen: `/einstellungen/info/lizenzen` (Übersicht) und `/einstellungen/info/lizenzen/texte` (vollständige Texte).
- Lizenzen stehen so, wie die Pakete sie angeben (`MIT`, `Apache-2.0`, `ISC`, `0BSD`, `Unlicense`), je Projekt verschieden und sortiert (`Array.prototype.sort()`). Projekte alphabetisch mit `localeCompare(…, "de")`.
- TDD, vor jedem Commit grün: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Commit-Nachrichten `feat: …` oder `fix: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Der gemeldete Fehler: Auf beiden neuen Seiten ist die untere Leiste da und ein Zurück-Link führt eine Ebene höher. Test in Task 3 über die ganze App.
2. Ohne Netz nach dem ersten Besuch: Die JSON-Datei steht im Vorab-Cache wie die Textdatei. Test in Task 1.
3. Laden scheitert (Entwicklungsserver, 404, kein Netz): Statt einer leeren Seite erscheint eine Meldung mit `role="alert"`, der Zurück-Link bleibt. Tests in Task 2 und 3.
4. Ein Paket steckt in zwei Versionen im Build: Es zählt doppelt, löst aber keinen Fehler „in mehreren Projekten“ aus. Test in Task 1.
5. Lange Zeilen ohne Leerzeichen in den Lizenztexten (URLs) brechen um, die Seite scrollt auf 375 px nicht seitlich. Test der Klassen in Task 3, Browser-Prüfung in Task 3.

---

### Task 1: Übersicht im Build erzeugen

**Files:**
- Create: `src/core/licenses.ts`
- Create: `vite/licenseProjects.ts`
- Modify: `vite/licenses.ts` (`summarizeNotices`, `projectsOf`, Plugin legt die JSON-Datei ab, `LICENSES_FILE` entfällt zugunsten von `LICENSES_TEXT_FILE`)
- Modify: `vite/pwa.ts` (`json` in `globPatterns`)
- Test: `vite/licenses.test.ts`, `vite/pwa.test.ts`

**Interfaces:**
- Produces in `src/core/licenses.ts` (keine Importe):
  - `export const LICENSES_TEXT_FILE = "third-party-licenses.txt"`
  - `export const LICENSES_SUMMARY_FILE = "third-party-licenses.json"`
  - `export type LicenseSummary = { packages: number; projects: { name: string; licenses: string[] }[] }`
- Produces in `vite/licenseProjects.ts`:
  - `export type LicenseProject = { name: string; packages?: string[]; prefixes?: string[] }`
  - `export const LICENSE_PROJECTS: LicenseProject[]`
- Produces in `vite/licenses.ts`:
  - `export function projectsOf(name: string, projects: LicenseProject[]): LicenseProject[]` (alle Projekte, deren `packages` den Namen enthält oder deren `prefixes` ihn einleitet)
  - `export function summarizeNotices(notices: PackageNotice[], projects: LicenseProject[]): LicenseSummary` (wirft einen `Error`, dessen Meldung jedes Problem in einer eigenen Zeile nennt)
- `vite/licenses.ts` importiert aus `"../src/core/licenses.ts"` (wie `vite/bootFallback.ts` aus `../src/texts.ts`).

- [ ] **Step 1: Tests für `summarizeNotices` und die echte Liste schreiben** (in `vite/licenses.test.ts`)

```ts
const notice = (name: string, license = "MIT", version = "1.0.0"): PackageNotice =>
  ({ name, version, license, texts: [] });
const PROJECTS: LicenseProject[] = [
  { name: "React", packages: ["react", "react-dom"] },
  { name: "Radix UI", packages: ["tslib"], prefixes: ["@radix-ui/"] },
];

describe("summarizeNotices", () => {
  it("fasst Pakete zu Projekten zusammen und sammelt deren Lizenzen", () => {
    expect(
      summarizeNotices(
        [notice("react"), notice("react-dom"), notice("@radix-ui/react-dialog"), notice("tslib", "0BSD")],
        PROJECTS,
      ),
    ).toEqual({
      packages: 4,
      projects: [
        { name: "Radix UI", licenses: ["0BSD", "MIT"] },
        { name: "React", licenses: ["MIT"] },
      ],
    });
  });

  it("zählt ein Paket in zwei Versionen doppelt, ohne es als doppelt zugeordnet zu melden", () => {
    const summary = summarizeNotices(
      [notice("react", "MIT", "18.3.1"), notice("react", "MIT", "19.0.0"), notice("tslib", "0BSD")],
      PROJECTS,
    );
    expect(summary.packages).toBe(3);
  });

  it("meldet ein Paket ohne Projekt", () => {
    expect(() => summarizeNotices([notice("react"), notice("tslib"), notice("zod")], PROJECTS))
      .toThrow("Paket ohne Projekt in der Lizenzübersicht: zod");
  });

  it("meldet ein Paket in mehreren Projekten", () => {
    const projects = [{ name: "A", packages: ["x"] }, { name: "B", prefixes: ["x"] }];
    expect(() => summarizeNotices([notice("x")], projects))
      .toThrow("Paket in mehreren Projekten der Lizenzübersicht: x (A, B)");
  });

  it("meldet ein Projekt ohne Paket im Build", () => {
    expect(() => summarizeNotices([notice("react")], PROJECTS))
      .toThrow("Projekt ohne Paket im Build: Radix UI");
  });

  it("nennt alle Probleme auf einmal, je eines pro Zeile", () => {
    expect(() => summarizeNotices([notice("zod")], PROJECTS)).toThrow(
      /Paket ohne Projekt in der Lizenzübersicht: zod\n(.|\n)*Projekt ohne Paket im Build: R/,
    );
  });
});
```

Dazu im vorhandenen `describe("Abhängigkeiten")`:

```ts
it("jedes Paket aus dependencies und EXTRA_PACKAGES gehört zu genau einem Projekt", () => {
  for (const name of [...dependencies, ...EXTRA_PACKAGES]) {
    expect(projectsOf(name, LICENSE_PROJECTS).map((p) => p.name), name).toHaveLength(1);
  }
});
```

- [ ] **Step 2: Test für den Vorab-Cache schreiben** (in `vite/pwa.test.ts`, neben dem Test für `txt`)

```ts
it("die Lizenzübersicht (json) steht im Vorab-Cache und ist offline da", () => {
  const patterns = pwaOptions.workbox?.globPatterns ?? [];
  expect(patterns.some((p) => /\{[^}]*\bjson\b[^}]*\}/.test(p))).toBe(true);
});
```

- [ ] **Step 3: Tests laufen lassen und rot sehen**

Run: `npx vitest run vite/licenses.test.ts vite/pwa.test.ts`
Expected: FAIL, `summarizeNotices`, `projectsOf`, `LICENSE_PROJECTS` fehlen, das json-Muster fehlt.

- [ ] **Step 4: `src/core/licenses.ts` und `vite/licenseProjects.ts` anlegen**

`LICENSE_PROJECTS` genau mit dieser Startliste (Kommentar im Kopf: Hilfspakete zählen zu dem Projekt, das sie mitbringt; ein neues Paket im Build ohne Eintrag lässt den Build scheitern):

| name | packages | prefixes |
|---|---|---|
| React | react, react-dom, scheduler, use-sync-external-store | |
| Radix UI | radix-ui, aria-hidden, get-nonce, react-remove-scroll, react-remove-scroll-bar, react-style-singleton, tslib, use-callback-ref, use-sidecar | `@radix-ui/` |
| shadcn/ui | shadcn, class-variance-authority, clsx, cn | |
| Tailwind CSS | tailwindcss, tw-animate-css | |
| Lucide | lucide-react | |
| wouter | wouter, regexparam | |
| Zod | zod | |
| idb | idb | |
| jsQR | jsqr | |
| qrcode | qrcode, dijkstrajs | |
| fflate | fflate | |
| Workbox | | `workbox-` |

`radix-ui` steht in `dependencies`, landet aber nicht im Build; der Eintrag hält den Test aus Step 1 grün.

- [ ] **Step 5: `projectsOf` und `summarizeNotices` in `vite/licenses.ts` umsetzen**

Meldungen wörtlich, alle gesammelt und mit `"\n"` verbunden:
- `Paket ohne Projekt in der Lizenzübersicht: ${name}`
- `Paket in mehreren Projekten der Lizenzübersicht: ${name} (${namen.join(", ")})`
- `Projekt ohne Paket im Build: ${projekt}`

Ein Paketname, der mehrfach vorkommt (verschiedene Versionen), wird nur einmal auf Zuordnung geprüft und zählt in `packages` so oft, wie er vorkommt.

- [ ] **Step 6: Plugin erweitern und `json` vorspeichern**

In `generateBundle` nach dem Sortieren `summarizeNotices(…, LICENSE_PROJECTS)` aufrufen. Wirft es, die Meldung an `this.error(…)` geben. Zweite Datei ausgeben: `fileName: LICENSES_SUMMARY_FILE`, `source: JSON.stringify(summary, null, 2) + "\n"`. Die Textdatei heißt weiter `LICENSES_TEXT_FILE`. In `vite/pwa.ts`: `"**/*.{js,css,html,ico,png,svg,webmanifest,txt,json}"`.

- [ ] **Step 7: Tests grün sehen**

Run: `npx vitest run vite/licenses.test.ts vite/pwa.test.ts`
Expected: PASS

- [ ] **Step 8: Echten Build prüfen**

Run: `npm run build` und danach
`node -e "const s=require('./dist/third-party-licenses.json');console.log(s.packages, s.projects.length);console.log(s.projects.map(p=>p.name+': '+p.licenses.join(', ')).join(' | '))"`
Expected:
```
58 12
fflate: MIT | idb: ISC | jsQR: Apache-2.0 | Lucide: ISC | qrcode: MIT | Radix UI: 0BSD, MIT | React: MIT | shadcn/ui: Apache-2.0, MIT | Tailwind CSS: MIT | Workbox: MIT | wouter: MIT, Unlicense | Zod: MIT
```
Außerdem: `grep -c "third-party-licenses.json" dist/sw.js` ergibt mindestens 1.

- [ ] **Step 9: Lint, Typprüfung, alle Tests, dann Commit**

```bash
git add src/core/licenses.ts vite/licenseProjects.ts vite/licenses.ts vite/licenses.test.ts vite/pwa.ts vite/pwa.test.ts
git commit -m "feat: license summary by project as a build file"
```

---

### Task 2: Seite „Verwendete Software“ und Link auf der Info-Seite

**Files:**
- Create: `src/app/settings/licenseData.ts`, `src/app/settings/licenseData.test.ts`
- Create: `src/app/settings/LicensesScreen.tsx`, `src/app/settings/LicensesScreen.test.tsx`
- Modify: `src/app/settings/InfoScreen.tsx`, `src/app/settings/InfoScreen.test.tsx`
- Modify: `src/app/App.tsx` (Route)
- Modify: `src/texts.ts`

**Interfaces:**
- Consumes: `LicenseSummary`, `LICENSES_SUMMARY_FILE` aus `@/core/licenses`.
- Produces:
  - `export async function loadLicenseSummary(): Promise<LicenseSummary>` in `licenseData.ts`: `fetch(import.meta.env.BASE_URL + LICENSES_SUMMARY_FILE)`, wirft bei `!response.ok`, sonst `response.json()`.
  - `export function LicensesScreen({ load = loadLicenseSummary }: { load?: () => Promise<LicenseSummary> })`
  - Texte unter `T.licenseScreen` (siehe Step 3). `T.licenses.title` entfällt, `T.licenses.text` und `T.licenses.link` bleiben.

- [ ] **Step 1: Tests schreiben**

`licenseData.test.ts` (mit `afterEach(() => vi.unstubAllGlobals())`):
- „lädt die Übersicht von der eigenen Seite“: `fetch` als `vi.fn(async () => new Response(JSON.stringify(SUMMARY)))` stubben, Ergebnis `toEqual(SUMMARY)`, `fetch` wurde mit `"/third-party-licenses.json"` aufgerufen.
- „scheitert, wenn die Datei fehlt“: Antwort `new Response("", { status: 404 })`, `await expect(loadLicenseSummary()).rejects.toThrow()`.

`LicensesScreen.test.tsx` (wie `InfoScreen.test.tsx` mit `await seed({})` und `renderWithData(…, "/einstellungen/info/lizenzen")`):

```ts
const SUMMARY: LicenseSummary = {
  packages: 58,
  projects: [
    { name: "Radix UI", licenses: ["0BSD", "MIT"] },
    { name: "React", licenses: ["MIT"] },
  ],
};

it("zeigt Gesamtzahl und Projekte mit ihren Lizenzen", async () => {
  // load={async () => SUMMARY}
  expect(await screen.findByText(
    "ImpfPass enthält freie Software von Dritten: 58 Pakete aus 2 Projekten.",
  )).toBeTruthy();
  expect(screen.getByText("Radix UI").nextElementSibling?.textContent).toBe("0BSD, MIT");
  expect(screen.getByText("React").nextElementSibling?.textContent).toBe("MIT");
  expect(screen.getByRole("heading", { level: 1, name: "Verwendete Software" })).toBeTruthy();
});

it("führt zu den Lizenztexten und zurück zur Info-Seite", async () => {
  // load={async () => SUMMARY}
  const texts = await screen.findByRole("link", { name: "Alle Lizenztexte ansehen" });
  expect(texts.getAttribute("href")).toBe("#/einstellungen/info/lizenzen/texte");
  expect(screen.getByRole("link", { name: "Info" }).getAttribute("href")).toBe("#/einstellungen/info");
});

it("zeigt beim Laden einen Hinweis", async () => {
  // load={() => new Promise(() => {})}
  expect(screen.getByText("Wird geladen …")).toBeTruthy();
});

it("meldet, wenn die Angaben nicht geladen werden können, und lässt den Weg zurück offen", async () => {
  // load={() => Promise.reject(new Error("offline"))}
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Lizenzangaben konnten nicht geladen werden. Bitte versuche es später noch einmal.",
  );
  expect(screen.getByRole("link", { name: "Info" })).toBeTruthy();
});
```

`InfoScreen.test.tsx`, den Lizenz-Test ersetzen:

```ts
it("verweist innerhalb der App auf die verwendete Software", async () => {
  await seed({});
  await renderWithData(<InfoScreen />);
  expect(screen.getByRole("heading", { level: 2, name: "Verwendete Software" })).toBeTruthy();
  expect(screen.getByText(/Eine Übersicht zeigt, welche das sind/)).toBeTruthy();
  const link = screen.getByRole("link", { name: "Übersicht ansehen" });
  expect(link.getAttribute("href")).toBe("#/einstellungen/info/lizenzen");
  // Kein neues Fenster: In der App vom Home-Bildschirm käme man nicht zurück.
  expect(link.getAttribute("target")).toBeNull();
});
```

- [ ] **Step 2: Tests laufen lassen und rot sehen**

Run: `npx vitest run src/app/settings`
Expected: FAIL, Module und Texte fehlen, der Link zeigt noch auf die Datei.

- [ ] **Step 3: Texte in `src/texts.ts`**

`T.licenses.title` entfernen. Neu, wörtlich:

```ts
licenseScreen: {
  title: "Verwendete Software",
  infoText:
    "ImpfPass nutzt freie Bibliotheken. Eine Übersicht zeigt, welche das sind und unter welchen Lizenzen sie stehen.",
  infoLink: "Übersicht ansehen",
  intro: (packages: number, projects: number) =>
    `ImpfPass enthält freie Software von Dritten: ${packages} Pakete aus ${projects} Projekten.`,
  textsLink: "Alle Lizenztexte ansehen",
  textsTitle: "Lizenztexte",
  loadFailed:
    "Die Lizenzangaben konnten nicht geladen werden. Bitte versuche es später noch einmal.",
},
```

- [ ] **Step 4: `licenseData.ts`, `LicensesScreen.tsx`, Info-Seite und Route umsetzen**

- `LicensesScreen`: oben ein Zurück-Link wie auf der Info-Seite (`ChevronLeft`, Klassen wie dort), Ziel `/einstellungen/info`, Text `T.info.title`. Dann `h1` mit `T.licenseScreen.title` (`text-2xl font-semibold`). Zustand laden / Fehler / Daten mit `useEffect` und Abbruch-Merker beim Verlassen. Laden: `<p>{T.app.loading}</p>`. Fehler: `<p role="alert">`. Daten: `<p>` mit `intro(summary.packages, summary.projects.length)`, dann eine `<dl>` mit je einer Zeile `<div className="flex justify-between gap-4 border-b py-1">`, darin `<dt>` (Projektname) und `<dd className="text-right text-muted-foreground">` (Lizenzen mit `", "`). Darunter wouter-`Link` zu `/einstellungen/info/lizenzen/texte` mit `T.licenseScreen.textsLink` (`inline-flex min-h-11 items-center self-start underline`).
- `InfoScreen`: Überschrift `T.licenseScreen.title`, Absatz `T.licenseScreen.infoText`, statt `<a target="_blank">` ein wouter-`Link` zu `/einstellungen/info/lizenzen` mit `T.licenseScreen.infoLink`, gleiche Klassen wie bisher.
- `App.tsx`: `<Route path="/einstellungen/info/lizenzen"><LicensesScreen /></Route>`.

- [ ] **Step 5: Tests grün sehen**

Run: `npx vitest run src/app/settings`
Expected: PASS

- [ ] **Step 6: Lint, Typprüfung, alle Tests, Build, dann Commit**

```bash
git add src/texts.ts src/app/App.tsx src/app/settings/licenseData.ts src/app/settings/licenseData.test.ts src/app/settings/LicensesScreen.tsx src/app/settings/LicensesScreen.test.tsx src/app/settings/InfoScreen.tsx src/app/settings/InfoScreen.test.tsx
git commit -m "feat: page with the software used, linked inside the app"
```

---

### Task 3: Seite „Lizenztexte“

**Files:**
- Create: `src/app/settings/LicenseTextsScreen.tsx`, `src/app/settings/LicenseTextsScreen.test.tsx`
- Modify: `src/app/settings/licenseData.ts`, `src/app/settings/licenseData.test.ts`
- Modify: `src/app/App.tsx` (Route), `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `LICENSES_TEXT_FILE`, `T.licenseScreen` aus Task 2.
- Produces:
  - `export async function loadLicenseTexts(): Promise<string>` in `licenseData.ts`: `fetch(import.meta.env.BASE_URL + LICENSES_TEXT_FILE)`, wirft bei `!response.ok`, sonst `response.text()`.
  - `export function LicenseTextsScreen({ load = loadLicenseTexts }: { load?: () => Promise<string> })`

- [ ] **Step 1: Tests schreiben**

`licenseData.test.ts`: „lädt die Lizenztexte von der eigenen Seite“ (Aufruf mit `"/third-party-licenses.txt"`, Ergebnis ist der Text) und „scheitert, wenn die Textdatei fehlt“ (404, `rejects.toThrow()`).

`LicenseTextsScreen.test.tsx` (`await seed({})`, `renderWithData(…, "/einstellungen/info/lizenzen/texte")`):

```ts
it("zeigt die Lizenztexte umbrechend und führt oben und unten zurück zur Übersicht", async () => {
  // load={async () => "react 19.0.0\nLizenz: MIT\n\nMIT License"}
  expect(screen.getByRole("heading", { level: 1, name: "Lizenztexte" })).toBeTruthy();
  const text = await screen.findByText(/MIT License/);
  expect(text.tagName).toBe("PRE");
  expect(text.className).toContain("whitespace-pre-wrap");
  expect(text.className).toContain("break-words");
  const back = screen.getAllByRole("link", { name: "Verwendete Software" });
  expect(back).toHaveLength(2);
  for (const link of back) expect(link.getAttribute("href")).toBe("#/einstellungen/info/lizenzen");
});

it("meldet, wenn die Texte nicht geladen werden können", async () => {
  // load={() => Promise.reject(new Error("offline"))}
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Die Lizenzangaben konnten nicht geladen werden. Bitte versuche es später noch einmal.",
  );
  expect(screen.getAllByRole("link", { name: "Verwendete Software" }).length).toBeGreaterThan(0);
});
```

`App.test.tsx` (der gemeldete Fehler, über die ganze App):

```ts
it("die Lizenzseiten behalten die untere Navigation und führen zurück", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    url.endsWith(".json")
      ? new Response(JSON.stringify({ packages: 1, projects: [{ name: "React", licenses: ["MIT"] }] }))
      : new Response("MIT License")));
  onTestFinished(() => vi.unstubAllGlobals());
  await seed({});
  window.location.hash = "#/einstellungen/info/lizenzen";
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByText("React")).toBeTruthy();
  expect(screen.getByRole("navigation")).toBeTruthy();
  await user.click(screen.getByRole("link", { name: "Alle Lizenztexte ansehen" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Lizenztexte" })).toBeTruthy();
  expect(await screen.findByText("MIT License")).toBeTruthy();
  expect(screen.getByRole("navigation")).toBeTruthy();
  await user.click(screen.getAllByRole("link", { name: "Verwendete Software" })[0]);
  expect(await screen.findByRole("heading", { level: 1, name: "Verwendete Software" })).toBeTruthy();
});
```

- [ ] **Step 2: Tests laufen lassen und rot sehen**

Run: `npx vitest run src/app/settings src/app/App.test.tsx`
Expected: FAIL, `loadLicenseTexts` und `LicenseTextsScreen` fehlen, die Route fehlt.

- [ ] **Step 3: `loadLicenseTexts`, `LicenseTextsScreen` und Route umsetzen**

- Aufbau wie `LicensesScreen`: oben Zurück-Link (`ChevronLeft`) zu `/einstellungen/info/lizenzen` mit Text `T.licenseScreen.title`, `h1` mit `T.licenseScreen.textsTitle`, Laden und Fehler wie dort. Daten: `<pre className="whitespace-pre-wrap break-words text-sm">`. Am Ende, nach Inhalt, Meldung oder Ladehinweis, derselbe Zurück-Link noch einmal.
- `App.tsx`: `<Route path="/einstellungen/info/lizenzen/texte"><LicenseTextsScreen /></Route>`.

- [ ] **Step 4: Tests grün sehen**

Run: `npx vitest run src/app/settings src/app/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Im Browser prüfen**

`npm run build` und `npm run preview`, Fenster auf 375 × 812. Info, „Übersicht ansehen“: 12 Projekte, die Liste passt ungefähr auf eine Bildschirmseite. „Alle Lizenztexte ansehen“: Text bricht um, `document.documentElement.scrollWidth` ist nicht größer als `clientWidth`. Beide Zurück-Links und die untere Leiste funktionieren.

- [ ] **Step 6: Lint, Typprüfung, alle Tests, Build, dann Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx src/app/settings/licenseData.ts src/app/settings/licenseData.test.ts src/app/settings/LicenseTextsScreen.tsx src/app/settings/LicenseTextsScreen.test.tsx
git commit -m "feat: full license texts as a page inside the app"
```
