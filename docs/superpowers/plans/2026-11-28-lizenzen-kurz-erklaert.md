# Lizenzen kurz erklärt – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Seite in der Handy-App erklärt die verwendeten Lizenzen kurz; die Übersicht verlinkt sie neben den umbenannten Lizenztexten.

**Architecture:** Erklärungen als Texte in `T.licenseScreen.explanations`. Das Build-Plugin bricht ab, wenn eine Lizenz der Übersicht keine Erklärung hat. Die neue Seite lädt die vorhandene Übersicht über `loadLicenseSummary` und zeigt nur vorkommende Lizenzen mit ihren Projekten.

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-11-28-lizenzen-kurz-erklaert-design.md`

## Global Constraints

- Wie im Plan `2026-11-28-lizenzen-in-der-app.md`: nur genannte Dateien per Pfad committen, nicht pushen ohne Ja des Users, Texte nur in `src/texts.ts` (wörtlich aus der Spec), Bedienflächen `min-h-11`, TDD, vor jedem Commit Lint, Typprüfung, Tests, Build grün, Trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Route `/einstellungen/info/lizenzen/erklaert`. Linktexte „Alle Lizenzen kurz erklärt“ und „Lizenztexte aller Pakete ansehen“, Überschrift „Lizenzen kurz erklärt“.

## Review Focus

1. Eine neue Lizenz kommt durch ein Update in den Build: Der Build bricht mit verständlicher Meldung ab. Test in Task 1.
2. Eine Lizenz, die nicht mehr vorkommt, erscheint nicht auf der Seite. Test in Task 2.
3. Eine Lizenz ohne Erklärung erreicht trotzdem die Seite: Sie steht mit Hinweis da statt still zu fehlen. Test in Task 2.
4. Laden scheitert: Meldung mit `role="alert"`, Zurück-Link bleibt. Test in Task 2.
5. Von der Erklärseite kommt man zurück, die untere Leiste bleibt. Test in Task 2 über die ganze App.

---

### Task 1: Erklärungen und Build-Prüfung

**Files:** Modify `src/texts.ts`, `vite/licenses.ts`, `vite/licenses.test.ts`

**Interfaces:**
- Produces in `src/texts.ts` unter `T.licenseScreen`: `textsLink: "Lizenztexte aller Pakete ansehen"`, `explainedLink: "Alle Lizenzen kurz erklärt"`, `explainedTitle: "Lizenzen kurz erklärt"`, `explainedIntro`, `explainedOutro`, `usedBy: (projects: readonly string[]) => \`Kommt vor bei: ${projects.join(", ")}\``, `unexplained: "Für diese Lizenz gibt es hier keine Erklärung. Ihr Text steht bei den Lizenztexten aller Pakete."`, `explanations: { MIT, ISC, "Apache-2.0", "0BSD", Unlicense }` (Texte wörtlich aus der Spec, Reihenfolge so).
- Produces in `vite/licenses.ts`: `export function unexplainedLicenses(summary: LicenseSummary, explained: readonly string[]): string[]` (vorkommende Kennungen ohne Erklärung, ohne Doppelte, sortiert).

- [ ] Step 1: Tests in `vite/licenses.test.ts`: `unexplainedLicenses` liefert `[]`, wenn alle erklärt sind, und `["GPL-3.0", "WTFPL"]` für eine Übersicht mit diesen Kennungen in zwei Projekten (eine davon doppelt) bei `explained = ["MIT"]`. Außerdem: „jede Lizenz der echten Pakete hat eine Erklärung“: `unexplainedLicenses(summarizeNotices(...))` ist hier nicht möglich, deshalb prüft der vorhandene Plugin-Test `runPlugin(ONE_PER_PROJECT)` weiter ohne Fehler.
- [ ] Step 2: Rot sehen (`npx vitest run vite/licenses.test.ts`).
- [ ] Step 3: `unexplainedLicenses` umsetzen. Im Plugin nach `summarizeNotices`: `unexplainedLicenses(summary, Object.keys(T.licenseScreen.explanations))`; ist die Liste nicht leer, `this.error(\`Lizenz ohne Erklärung in src/texts.ts (T.licenseScreen.explanations): ${list.join(", ")}\`)`. Import von `T` aus `"../src/texts.ts"` wie in `vite/bootFallback.ts`. Texte in `src/texts.ts` ergänzen, `textsLink` umbenennen und die zwei Tests, die den alten Linktext nutzen (`LicensesScreen.test.tsx`, `App.test.tsx`), auf den neuen Namen ziehen.
- [ ] Step 4: Grün sehen, `npm run build` läuft durch.
- [ ] Step 5: Commit `feat: license explanations with a build check`.

### Task 2: Seite „Lizenzen kurz erklärt“ und Links

**Files:** Create `src/app/settings/useLoaded.ts`, `src/app/settings/BackToSummary.tsx`, `src/app/settings/LicenseExplanationsScreen.tsx` und `.test.tsx`; Modify `LicensesScreen.tsx` und Test, `LicenseTextsScreen.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- `export type Loaded<T> = { status: "loading" } | { status: "failed" } | { status: "ready"; value: T }` und `export function useLoaded<T>(load: () => Promise<T>): Loaded<T>` in `useLoaded.ts` (Abbruch-Merker wie bisher). `LicensesScreen` und `LicenseTextsScreen` nutzen ihn statt ihres eigenen Zustands.
- `export function BackToSummary()` in `BackToSummary.tsx` (bisher lokal in `LicenseTextsScreen`).
- `export function LicenseExplanationsScreen({ load = loadLicenseSummary }: { load?: () => Promise<LicenseSummary> })`.

- [ ] Step 1: Tests schreiben.
  - `LicenseExplanationsScreen.test.tsx` mit `SUMMARY = { packages: 4, projects: [{ name: "jsQR", licenses: ["Apache-2.0"] }, { name: "Radix UI", licenses: ["0BSD", "MIT"] }, { name: "React", licenses: ["MIT"] }, { name: "Neu", licenses: ["WTFPL"] }] }`: Überschrift h1 „Lizenzen kurz erklärt“, Einleitung; h2 in dieser Reihenfolge `MIT`, `Apache-2.0`, `0BSD`, `WTFPL`; kein h2 `ISC` und `Unlicense`; „Kommt vor bei: Radix UI, React“ bei MIT, „Kommt vor bei: jsQR“ bei Apache-2.0; bei WTFPL der Text `T.licenseScreen.unexplained`; Schlusssatz; Zurück-Link „Verwendete Software“ nach `#/einstellungen/info/lizenzen`. Fehlerfall: `role="alert"` mit `T.licenseScreen.loadFailed`, Zurück-Link da.
  - `LicensesScreen.test.tsx`: Link „Alle Lizenzen kurz erklärt“ nach `#/einstellungen/info/lizenzen/erklaert` steht im DOM vor „Lizenztexte aller Pakete ansehen“.
  - `App.test.tsx`, im Test der Lizenzseiten: nach der Rückkehr zur Übersicht „Alle Lizenzen kurz erklärt“ öffnen, h1 „Lizenzen kurz erklärt“, Navigation da, Zurück-Link führt zur Übersicht.
- [ ] Step 2: Rot sehen (`npx vitest run src/app/settings src/app/App.test.tsx`).
- [ ] Step 3: Umsetzen. Seite wie die anderen Lizenzseiten (`flex flex-col gap-6`, `BackToSummary`, h1 `text-2xl font-semibold`, h2 `text-xl font-semibold`). Je Lizenz ein `section` mit h2, Absatz und „Kommt vor bei“ (`text-muted-foreground`). Route in `App.tsx`. In `LicensesScreen` die zwei Links in eigenem Block untereinander.
- [ ] Step 4: Grün sehen, dann alle Tests, Lint, Typprüfung, Build.
- [ ] Step 5: Browser bei 375 × 812: Übersicht zeigt beide Links, Erklärseite zeigt fünf Lizenzen mit Projekten, keine seitliche Scrollleiste, Zurück-Link und Leiste unten.
- [ ] Step 6: Commit `feat: page that explains the licenses in short`.
