# ImpfPass Plan 1: Grundgerüst und Impfliste – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine installierbare Handy-Web-App unter `https://impfpass.github.io/`, in der man Impfungen von Hand einträgt, nach Datum, Impfstoff und Krankheit sortiert ansieht und sichert.

**Architecture:** Vite-Build einer React-App, alles läuft im Browser. Ein Kern unter `src/core/` (Datenmodell, Datumshilfen, Impfstoffliste, Speicher, Sicherungsformat) enthält reine, getestete Funktionen ohne Oberfläche. Die Oberfläche unter `src/app/` liest und schreibt nur über den Kern. Veröffentlicht wird über GitHub Actions auf GitHub Pages, nur wenn Lint, Typprüfung, Tests und Build grün sind.

**Tech Stack:** Vite, React 19, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui (Radix), wouter (Hash-Routing), idb (IndexedDB), zod 4, vite-plugin-pwa, Vitest 4 mit jsdom, Testing Library, fake-indexeddb, ESLint 9, Prettier. Versionen wie im GTD-Projekt (`C:\Dev\GettingThingsDone\package.json`), wo es dieselben Pakete sind.

**Spec:** `docs/superpowers/specs/2026-11-26-impfpass-design.md`

**Planreihe:** Das Design wird in fünf Plänen umgesetzt, jeder liefert lauffähige, getestete Software:
1. Grundgerüst und Impfliste (dieser Plan)
2. Empfehlungen: STIKO-Regeln, Angaben zur Person, Übersicht mit Fälligkeiten, Karten „Mit dem Arzt besprechen“, „Neu“-Erkennung, STIKO-Wächter
3. PC-Import und QR-Übertragung
4. GTD-Übergabe in ImpfPass
5. Übernahmeseite in der GTD-App (Repo `C:\Dev\GettingThingsDone`)

Jeder Folgeplan wird geschrieben, wenn der vorige fertig ist.

## Global Constraints

- Zur Laufzeit keine Anfragen an Dritte, keine externen Schriften, keine Analyse-Dienste. Alle Bibliotheken werden mitgeliefert (Spec 5, 12).
- Alle Daten bleiben im Browser (IndexedDB). Sie verlassen das Gerät nur, wenn der Anwender es ausdrücklich auslöst (Spec 12).
- Oberfläche nur Deutsch. Alle Texte der Oberfläche stehen in `src/app/texts.ts` (Spec 14).
- Handy-App an der Wurzel von `https://impfpass.github.io/`, Repo `impfpass/impfpass.github.io`, Lizenz MIT (Spec 5, 14).
- Voreinstellungen: Vorlauf 6 Monate, Saison-Tag `09-01` (Spec 6.1, 9.1).
- Gut lesbar auch für Ältere: Grundschrift 18 px (`html { font-size: 112.5% }`), Bedienflächen mindestens 44 × 44 px, helles und dunkles Design nach Systemeinstellung (Spec 14).
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`); Bestätigungen über shadcn `AlertDialog` (Konvention aus dem GTD-Projekt).
- Kalenderdaten sind Strings `YYYY-MM-DD`. Mit `Date` wird nur in `todayISO` gerechnet (siehe Review Focus 3).
- Bezeichner im Code englisch, Texte der Oberfläche deutsch.
- CI mit Node 22. Die Tests laufen vor jedem Deploy, bei Fehlern wird nicht veröffentlicht (Spec 13).
- Commit-Nachrichten im Stil `feat: …`/`fix: …`/`chore: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Speicher nicht verfügbar** (privater Modus, gesperrte Website-Daten): Die App zeigt eine verständliche Meldung statt einer weißen Seite. Test in Task 6.
2. **Kaputte, fremde oder zu neue Sicherungsdatei:** klare Fehlermeldung, vorhandene Daten bleiben unverändert. Tests in Task 5 und Task 8.
3. **Datum kurz nach Mitternacht:** `new Date().toISOString()` liefert UTC und damit in Deutschland zwischen 0 und 1 bzw. 2 Uhr den Vortag. `todayISO` muss das lokale Datum liefern. Test in Task 2.
4. **Alte Einträge mit nur Monat oder Jahr:** stabile Sortierung, Anzeige `12/2016` bzw. `2016`, Prüfung „vor dem Geburtstag“ auf der Ebene der bekannten Genauigkeit. Tests in Task 2, 7 und 9.
5. **Kombi-Impfstoff:** Boostrix Polio erscheint in der Sortierung nach Krankheit unter Tetanus, Diphtherie, Keuchhusten und Polio und verschwindet beim Löschen überall. Test in Task 7.

## Vorbereitung durch den Nutzer

- [ ] Auf GitHub die kostenlose Organisation `impfpass` anlegen (github.com → Profilbild → „Your organizations“ → „New organization“ → Free). Das kann Claude nicht übernehmen.

---

### Task 1: Projektgerüst

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `.prettierrc` (Kopie aus `C:\Dev\GettingThingsDone\.prettierrc`), `.prettierignore`, `.gitignore`, `components.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/texts.ts`, `src/index.css`, `src/test/setup.ts`, `CLAUDE.md`, `README.md`, `LICENSE`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: Alias `@/` → `src/`; Skripte `dev`, `build`, `preview`, `lint` (`eslint . --max-warnings=0`), `typecheck` (`tsc -b`), `test` (`vitest run`); `T` aus `src/app/texts.ts` (verschachteltes Objekt mit allen Texten).

- [ ] **Step 1:** In `C:\Dev\ImpfPass` `git init -b main` ausführen. Die Spec und dieser Plan liegen schon unter `docs/`.
- [ ] **Step 2:** Abhängigkeiten installieren: `react react-dom wouter idb zod clsx tailwind-merge class-variance-authority lucide-react radix-ui` sowie als Dev-Abhängigkeiten `vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite tw-animate-css vite-plugin-pwa vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event fake-indexeddb eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier prettier shadcn`. `"engines": { "node": ">=22" }`.
- [ ] **Step 3:** Konfiguration anlegen. `vitest.config.ts`: Umgebung `jsdom`, `setupFiles: ['./src/test/setup.ts']`, und ganz oben `process.env.TZ = 'Europe/Berlin'`. `src/test/setup.ts` importiert `fake-indexeddb/auto` und ruft nach jedem Test `cleanup()` auf. `npx shadcn@latest init` mit Tailwind 4, Alias `@/components`, Basisfarbe neutral. In `src/index.css` `html { font-size: 112.5%; }`.
- [ ] **Step 4: Failing test schreiben**

```tsx
// src/app/App.test.tsx
it('zeigt den App-Namen', async () => {
  render(<App />)
  expect(await screen.findByText('ImpfPass')).toBeTruthy()
})
```

- [ ] **Step 5:** `npm test` → FAIL (App fehlt).
- [ ] **Step 6:** `App` rendert vorerst eine Überschrift mit `T.app.name` (`'ImpfPass'`).
- [ ] **Step 7:** `npm run lint && npm run typecheck && npm test && npm run build` → alles grün, `dist/index.html` existiert.
- [ ] **Step 8:** `LICENSE`: MIT, Inhaber `ImpfPass contributors` (Klarname nur, wenn der Nutzer es will). `README.md`: Zweck in drei Sätzen, Hinweis „ImpfPass ersetzt keine ärztliche Beratung.“, Adresse, Befehle. `CLAUDE.md`: Zweck, Befehle, Ordnerstruktur, die Global Constraints oben, Verweis auf Spec und Plan.
- [ ] **Step 9: Commit** `chore: set up Vite, React, Tailwind, Vitest`

### Task 2: Datenmodell und Datumshilfen

**Files:**
- Create: `src/core/model.ts`, `src/core/dates.ts`
- Test: `src/core/dates.test.ts`

**Interfaces:**
- Produces:
```ts
// model.ts
export type ISODate = string            // 'YYYY-MM-DD'
export type DatePrecision = 'day' | 'month' | 'year'
export interface PersonAnswers {
  chronicIllness: boolean
  fsme: 'yes' | 'no' | 'open'
  job: { patients: boolean; communityFacility: boolean; bloodContact: boolean; animalContact: boolean }
}
export interface Person { id: string; name: string; birthDate: ISODate; answers: PersonAnswers; createdAt: string }
export interface Vaccination {
  id: string; personId: string; date: ISODate; datePrecision: DatePrecision
  productId: string | null; label: string; diseases: DiseaseId[]
  batch?: string; doctor?: string; note?: string
  source: 'manual' | 'import'; importId?: string; createdAt: string; updatedAt: string
}
export interface Decision {
  personId: string; recommendationId: string
  kind: 'declined' | 'not_needed' | 'doctor_recommends' | 'doctor_not_applicable'
  reason?: string; at: string
}
export type ListSort = 'date-desc' | 'date-asc' | 'product' | 'disease'
export interface Settings {
  leadMonths: number; seasonDay: string; listSort: ListSort
  gtdUrl?: string; lastBackupAt?: string; installHintDismissed?: boolean
}
export const DEFAULT_ANSWERS: PersonAnswers  // chronicIllness false, fsme 'open', alle job-Felder false
export const DEFAULT_SETTINGS: Settings      // { leadMonths: 6, seasonDay: '09-01', listSort: 'date-desc' }
// dates.ts
export function todayISO(now?: Date): ISODate
export function isValidISODate(s: string): boolean
export function normalizeToPrecision(date: ISODate, p: DatePrecision): ISODate
export function formatDate(date: ISODate, p: DatePrecision): string
```
`DiseaseId` kommt aus Task 3; bis dahin in `model.ts` als `string` vorgesehen und in Task 3 auf den Typ aus `catalog/diseases.ts` umgestellt.

Gespeichert wird bei Monats- oder Jahresgenauigkeit das frühestmögliche Datum (`2016-12-01`, `2016-01-01`), die Genauigkeit steht daneben (Spec 7.3).

- [ ] **Step 1: Failing tests schreiben**

```ts
it('todayISO liefert das lokale Datum, nicht UTC', () => {
  expect(todayISO(new Date('2026-03-01T23:30:00Z'))).toBe('2026-03-02') // 00:30 in Berlin
})
it('isValidISODate', () => {
  expect(isValidISODate('2026-02-28')).toBe(true)
  expect(isValidISODate('2026-02-30')).toBe(false)
  expect(isValidISODate('28.02.2026')).toBe(false)
})
it('normalizeToPrecision', () => {
  expect(normalizeToPrecision('2016-12-05', 'month')).toBe('2016-12-01')
  expect(normalizeToPrecision('2016-12-05', 'year')).toBe('2016-01-01')
  expect(normalizeToPrecision('2016-12-05', 'day')).toBe('2016-12-05')
})
it('formatDate', () => {
  expect(formatDate('2016-12-05', 'day')).toBe('05.12.2016')
  expect(formatDate('2016-12-01', 'month')).toBe('12/2016')
  expect(formatDate('2016-01-01', 'year')).toBe('2016')
})
```

- [ ] **Step 2:** `npm test -- src/core/dates.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren. `todayISO` setzt das Datum aus `getFullYear/getMonth/getDate` zusammen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): add data model and date helpers`

### Task 3: Impfstoff- und Krankheitsliste mit Namenserkennung

**Files:**
- Create: `src/core/catalog/diseases.ts`, `src/core/catalog/products.ts`, `src/core/catalog/recognize.ts`
- Modify: `src/core/model.ts` (`DiseaseId` importieren)
- Test: `src/core/catalog/catalog.test.ts`, `src/core/catalog/recognize.test.ts`

**Interfaces:**
- Produces:
```ts
// diseases.ts
export const DISEASE_IDS = ['tetanus','diphtheria','pertussis','polio','measles','mumps','rubella',
  'varicella','hpv','hepatitis_a','hepatitis_b','pneumococcal','influenza','covid19','zoster','rsv',
  'tbe','meningococcal_c','meningococcal_acwy','meningococcal_b','hib','rotavirus','yellow_fever',
  'typhoid','rabies','japanese_encephalitis','cholera','mpox','dengue','chikungunya',
  'tuberculosis','smallpox'] as const
export type DiseaseId = (typeof DISEASE_IDS)[number]
export const DISEASES: Record<DiseaseId, { name: string; aliases: string[] }>
// products.ts
export interface Product { id: string; name: string; aliases: string[]; diseases: DiseaseId[]; historic?: boolean }
export const PRODUCTS: Product[]
export function getProduct(id: string): Product | undefined
// recognize.ts
export type Recognition =
  | { kind: 'exact'; product: Product }
  | { kind: 'fuzzy'; product: Product; distance: number }
  | { kind: 'ambiguous'; candidates: Product[] }
  | { kind: 'none' }
export function normalizeLabel(s: string): string
export function recognizeProduct(label: string): Recognition
export function suggestProducts(query: string, limit?: number): Product[]   // limit 8
```

Deutsche Namen der Krankheiten: Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio), Masern, Mumps, Röteln, Windpocken, HPV, Hepatitis A, Hepatitis B, Pneumokokken, Grippe, COVID-19, Gürtelrose, RSV, FSME, Meningokokken C, Meningokokken ACWY, Meningokokken B, Hib, Rotaviren, Gelbfieber, Typhus, Tollwut, Japanische Enzephalitis, Cholera, Mpox, Dengue, Chikungunya, Tuberkulose, Pocken.

- [ ] **Step 1: Lizenzstand prüfen.** `gh api repos/Nockchlhas/Impfbuch --jq .license` und `gh api repos/Nockchlhas/Impfbuch/issues/1/comments --jq '.[].body'`. Steht dort eine MIT-Lizenz, darf `js/data.js` des Originals als Ausgangspunkt dienen; dann Urheberhinweis in `README.md` und den Lizenztext des Originals in `THIRD_PARTY_LICENSES.md`. Sonst die Liste selbst zusammenstellen (Paul-Ehrlich-Institut, Fachinformationen). Ergebnis im Commit vermerken.
- [ ] **Step 2: Failing tests schreiben**

```ts
// catalog.test.ts
it('Produkt-IDs sind eindeutig, alle Krankheiten existieren', () => { /* Set-Größe == Länge; jede disease in DISEASE_IDS */ })
it('jede Krankheit hat mindestens einen Impfstoff', () => { /* für alle DISEASE_IDS */ })
it('enthält diese Impfstoffe mit diesen Krankheiten', () => {
  const byName = (n: string) => PRODUCTS.find(p => p.name === n)!
  expect(byName('Boostrix Polio').diseases.sort()).toEqual(['diphtheria','pertussis','polio','tetanus'])
  expect(byName('Shingrix').diseases).toEqual(['zoster'])
  expect(byName('Priorix').diseases.sort()).toEqual(['measles','mumps','rubella'])
  expect(byName('Encepur').diseases).toEqual(['tbe'])
  expect(byName('Zostavax').historic).toBe(true)
})
// recognize.test.ts
it('exakt trotz Schreibweise', () => {
  expect(recognizeProduct('boostrix-polio')).toMatchObject({ kind: 'exact', product: { name: 'Boostrix Polio' } })
})
it('unscharf bei Lesefehler', () => {
  expect(recognizeProduct('Boostrix Pollo')).toMatchObject({ kind: 'fuzzy', product: { name: 'Boostrix Polio' }, distance: 1 })
})
it('mehrdeutig bei gleich guten Kandidaten', () => {
  const r = recognizeProduct('Prevenar')
  expect(r.kind).toBe('ambiguous')
  if (r.kind === 'ambiguous') expect(r.candidates.map(p => p.name).sort()).toEqual(['Prevenar 13', 'Prevenar 20'])
})
it('nichts erkannt', () => { expect(recognizeProduct('Quarkspeise').kind).toBe('none') })
it('Vorschläge nach Anfang des Namens', () => {
  expect(suggestProducts('enc').map(p => p.name)).toContain('Encepur')
  expect(suggestProducts('').length).toBe(0)
})
```

- [ ] **Step 3:** Tests → FAIL.
- [ ] **Step 4:** Liste und Erkennung implementieren. Pflichtumfang der Liste: die Impfstoffe aus den Tests, dazu mindestens Td-pur, Td-Rix, Tetanol (historisch), Boostrix, Repevax, Covaxis, Revaxis, IPV Merieux, Polio-Schluckimpfung (historisch, Alias „OPV“), M-M-RvaxPro, Priorix-Tetra, ProQuad, Varivax, Varilrix, Gardasil, Gardasil 9, Cervarix, Engerix-B, HBVaxPro, Heplisav B, Havrix, Vaqta, Twinrix, Prevenar 13, Prevenar 20, Pneumovax 23, Vaxneuvance, Capvaxive, Influsplit Tetra, Vaxigrip Tetra, Fluad, Efluelda, Flucelvax, Comirnaty, Spikevax, Nuvaxovid, Vaxzevria, Jcovden, Arexvy, Abrysvo, mResvia, FSME-Immun, Menjugate, NeisVac-C, Nimenrix, Menveo, MenQuadfi, Bexsero, Trumenba, Stamaril, Typhim Vi, Vivotif, Rabipur, Verorab, Ixiaro, Dukoral, Imvanex, Qdenga, Ixchiq, BCG (historisch), Pocken-Impfstoff (historisch). Jeder Eintrag vor dem Aufnehmen an Fachinformation oder PEI geprüft.
  Erkennung: `normalizeLabel` macht klein, ersetzt ä/ö/ü/ß durch ae/oe/ue/ss und entfernt alles außer a–z und 0–9. Exakt = normalisierter Name oder Alias gleich. Sonst Levenshtein-Abstand zum nächsten Namen oder Alias; Treffer nur bei Abstand ≤ 2 und ≤ 25 % der Länge; mehrere Produkte mit gleichem kleinstem Abstand → `ambiguous`. `suggestProducts`: erst Namen/Aliase, die mit der normalisierten Eingabe beginnen, dann solche, die sie enthalten, alphabetisch, ohne Doppelte.
- [ ] **Step 5:** Tests → PASS.
- [ ] **Step 6: Commit** `feat(core): add vaccine catalog and name recognition`

### Task 4: Speicher

**Files:**
- Create: `src/core/storage/db.ts`, `src/core/storage/repository.ts`
- Test: `src/core/storage/repository.test.ts`

**Interfaces:**
- Consumes: Typen aus `model.ts`.
- Produces:
```ts
export class StorageUnavailableError extends Error {}
export interface BackupData { persons: Person[]; vaccinations: Vaccination[]; decisions: Decision[]; settings: Settings }
export interface Repository {
  getPersons(): Promise<Person[]>
  savePerson(p: Person): Promise<void>
  getVaccinations(personId: string): Promise<Vaccination[]>
  saveVaccination(v: Vaccination): Promise<void>
  deleteVaccination(id: string): Promise<void>
  getSettings(): Promise<Settings>            // DEFAULT_SETTINGS, wenn nichts gespeichert
  saveSettings(s: Settings): Promise<void>
  exportAll(): Promise<BackupData>
  replaceAll(data: BackupData): Promise<void> // eine Transaktion über alle Stores
}
export async function openRepository(): Promise<Repository>  // wirft StorageUnavailableError
export async function requestPersistence(): Promise<boolean> // navigator.storage?.persist(), sonst false
```
Datenbank `impfpass`, Version 1, Stores: `persons` (keyPath `id`), `vaccinations` (keyPath `id`, Index `byPerson` auf `personId`), `decisions` (keyPath `['personId','recommendationId']`), `ruleStates` (keyPath `personId`), `gtdStates` (keyPath `personId`), `settings` (ein Eintrag unter dem Schlüssel `'settings'`). Alle Stores schon jetzt, damit Plan 2 und 4 keine Migration brauchen (Spec 10).

- [ ] **Step 1: Failing tests schreiben** (jeder Test mit frischer DB: `indexedDB = new IDBFactory()` aus `fake-indexeddb` in `beforeEach`)

```ts
it('speichert und liest Personen und Impfungen getrennt nach Person', async () => { /* zwei Personen, je eine Impfung; getVaccinations(p1) liefert nur die von p1 */ })
it('löscht eine Impfung', async () => { /* nach deleteVaccination leer */ })
it('liefert Voreinstellungen ohne gespeicherte Einstellungen', async () => {
  expect(await repo.getSettings()).toEqual({ leadMonths: 6, seasonDay: '09-01', listSort: 'date-desc' })
})
it('replaceAll ersetzt alles, exportAll liefert es zurück', async () => { /* alte Daten weg, neue da */ })
it('openRepository wirft StorageUnavailableError, wenn IndexedDB fehlt', async () => {
  vi.stubGlobal('indexedDB', undefined)
  await expect(openRepository()).rejects.toBeInstanceOf(StorageUnavailableError)
})
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Mit `idb` implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): add IndexedDB storage`

### Task 5: Sicherungsformat

**Files:**
- Create: `src/core/formats/backup.ts`, `src/core/formats/schemas.ts`
- Test: `src/core/formats/backup.test.ts`

**Interfaces:**
- Consumes: `BackupData` (Task 4).
- Produces:
```ts
export interface BackupFile extends BackupData { format: 'impfpass-backup'; version: 1; createdAt: string }
export class BackupError extends Error {}
export function createBackup(data: BackupData, now: Date): BackupFile
export function serializeBackup(b: BackupFile): string       // JSON mit 2 Leerzeichen Einzug
export function parseBackup(text: string): BackupFile        // prüft mit zod, wirft BackupError
export function backupFileName(now: Date): string            // 'impfpass-sicherung-2026-11-26.json' (lokales Datum)
```
Fehlertexte (in `T`, hier wörtlich):
- kein JSON oder falsches `format`: „Diese Datei ist keine ImpfPass-Sicherung.“
- `version` größer als 1: „Diese Sicherung stammt aus einer neueren Version von ImpfPass. Bitte aktualisiere die App.“
- Inhalt passt nicht zum Schema: „Die Sicherung ist beschädigt und kann nicht gelesen werden.“

- [ ] **Step 1: Failing tests schreiben**

```ts
it('Hin- und Rückweg ergibt dieselben Daten', () => { /* parseBackup(serializeBackup(createBackup(d, now))) deep-equals */ })
it('lehnt fremdes JSON ab', () => { expect(() => parseBackup('{"foo":1}')).toThrow('keine ImpfPass-Sicherung') })
it('lehnt Nicht-JSON ab', () => { expect(() => parseBackup('hallo')).toThrow('keine ImpfPass-Sicherung') })
it('lehnt neuere Version ab', () => { /* version: 2 → toThrow('neueren Version') */ })
it('lehnt beschädigte Einträge ab', () => { /* Impfung ohne date → toThrow('beschädigt') */ })
it('Dateiname mit lokalem Datum', () => {
  expect(backupFileName(new Date('2026-03-01T23:30:00Z'))).toBe('impfpass-sicherung-2026-03-02.json')
})
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren; zod-Schemata für `Person`, `Vaccination`, `Decision`, `Settings` in `src/core/formats/schemas.ts`, damit Plan 3 sie wiederverwendet.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): add backup file format`

### Task 6: App-Gerüst, Datenanbindung und Ersteinrichtung

**Files:**
- Create: `src/app/data/AppData.tsx`, `src/app/Shell.tsx` (Kopf, untere Navigation), `src/app/setup/SetupScreen.tsx`, `src/app/StorageError.tsx`
- Modify: `src/app/App.tsx`, `src/app/texts.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `Repository`, `openRepository`, `requestPersistence` (Task 4).
- Produces:
```ts
export interface AppData {
  status: 'loading' | 'ready' | 'unavailable'
  person: Person | null
  vaccinations: Vaccination[]
  settings: Settings
  actions: {
    createPerson(input: { name: string; birthDate: ISODate }): Promise<void>
    updatePerson(p: Person): Promise<void>
    saveVaccination(v: Vaccination): Promise<void>
    deleteVaccination(id: string): Promise<void>
    saveSettings(s: Settings): Promise<void>
    restore(b: BackupFile): Promise<void>
  }
}
export function AppDataProvider(props: { open?: () => Promise<Repository>; children: ReactNode }): JSX.Element
export function useAppData(): AppData
```
`App` nimmt optional `open` entgegen und reicht es durch (für Tests). Die erste Person wird ausgewählt (Phase 1 zeigt genau eine Person). IDs mit `crypto.randomUUID()`.
Routen (wouter mit `useHashLocation`): `/` Übersicht, `/impfungen`, `/impfungen/neu`, `/impfungen/:id`, `/impfungen/:id/bearbeiten`, `/einstellungen`, `/einstellungen/info`. Untere Navigation: Übersicht, Impfungen, Neue Impfung (+), Einstellungen.

- [ ] **Step 1: Failing tests schreiben**

```tsx
it('ohne Person erscheint die Ersteinrichtung, danach die Übersicht', async () => {
  render(<App />)
  await user.type(await screen.findByLabelText('Name'), 'Christa')
  await user.type(screen.getByLabelText('Geburtsdatum'), '1967-03-01')
  await user.click(screen.getByRole('button', { name: 'Weiter' }))
  expect(await screen.findByRole('heading', { name: 'Übersicht' })).toBeTruthy()
})
it('Geburtsdatum in der Zukunft wird abgelehnt', async () => { /* Fehlermeldung „Das Geburtsdatum liegt in der Zukunft.“ */ })
it('ohne Speicher erscheint eine verständliche Meldung', async () => {
  render(<App open={() => Promise.reject(new StorageUnavailableError())} />)
  expect(await screen.findByText(/kann auf diesem Gerät keine Daten speichern/)).toBeTruthy()
})
```

Text der Speicher-Meldung: „ImpfPass kann auf diesem Gerät keine Daten speichern. Das passiert zum Beispiel im privaten Modus des Browsers. Öffne ImpfPass in einem normalen Fenster.“

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. Die Ersteinrichtung fragt Name und Geburtsdatum (Pflicht), legt die Person mit `DEFAULT_ANSWERS` an und ruft `requestPersistence()` auf. Die Wahl „Alte Impfungen vom PC übernehmen“ kommt mit Plan 3; bis dahin geht es direkt zur Übersicht.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): add app shell, data provider and first-run setup`

### Task 7: Impfliste mit drei Sortierungen

**Files:**
- Create: `src/app/list/grouping.ts`, `src/app/list/ListScreen.tsx`, `src/app/list/VaccinationRow.tsx`
- Test: `src/app/list/grouping.test.ts`, `src/app/list/ListScreen.test.tsx`

**Interfaces:**
- Consumes: `useAppData`, `getProduct`, `normalizeLabel`, `DISEASES`, `DISEASE_IDS`, `formatDate`.
- Produces:
```ts
export interface Group { key: string; title: string; items: Vaccination[] }
export function sortByDate(vs: Vaccination[], dir: 'asc' | 'desc'): Vaccination[]  // bei gleichem Datum nach createdAt
export function groupByProduct(vs: Vaccination[]): Group[] // key productId oder 'text:' + normalizeLabel(label); Titel Produktname bzw. label; Gruppen alphabetisch (localeCompare 'de'), Einträge neueste zuerst
export function groupByDisease(vs: Vaccination[]): Group[] // eine Gruppe je vorkommender Krankheit in DISEASE_IDS-Reihenfolge, Einträge neueste zuerst
```

- [ ] **Step 1: Failing tests schreiben**

```ts
it('sortiert nach Datum, Monats- und Jahresangaben am frühesten Tag', () => {
  // a: 2016-12-05 (day), b: 2016-12-01 (month), c: 2016-01-01 (year)
  expect(sortByDate([a, b, c], 'desc').map(v => v.id)).toEqual(['a', 'b', 'c'])
  expect(sortByDate([a, b, c], 'asc').map(v => v.id)).toEqual(['c', 'b', 'a'])
})
it('Kombi-Impfstoff steht unter jeder seiner Krankheiten', () => {
  const groups = groupByDisease([boostrixPolio])
  expect(groups.map(g => g.key)).toEqual(['tetanus', 'diphtheria', 'pertussis', 'polio'])
})
it('Freitext-Einträge gruppieren nach Bezeichnung', () => { /* zwei Einträge 'Tetanus-Impfung', 'tetanus impfung' → eine Gruppe */ })
```

```tsx
it('Sortierung wird gespeichert und nach Löschen ist der Eintrag überall weg', async () => {
  // Liste mit Boostrix Polio; auf „Krankheit“ umschalten → Eintrag 4-mal sichtbar;
  // settings.listSort === 'disease'; Eintrag löschen (über actions) → 0-mal sichtbar
})
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. Umschalter mit vier Stufen: „Neueste zuerst“, „Älteste zuerst“, „Impfstoff“, „Krankheit“ (shadcn `Tabs` oder `ToggleGroup`). Eine Zeile zeigt Datum (mit `formatDate`), Impfstoff bzw. Bezeichnung und die Krankheiten. Bei leerer Liste: „Noch keine Impfungen eingetragen.“ mit Knopf „Impfung eintragen“.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): add vaccination list with date, product and disease sorting`

### Task 8: Einstellungen, Sicherung und Info

**Files:**
- Create: `src/app/settings/SettingsScreen.tsx`, `src/app/settings/InfoScreen.tsx`, `src/app/backup/saveBackup.ts`, `src/app/backup/RestoreButton.tsx`
- Test: `src/app/backup/saveBackup.test.ts`, `src/app/backup/RestoreButton.test.tsx`

**Interfaces:**
- Consumes: `createBackup`, `serializeBackup`, `parseBackup`, `backupFileName`, `BackupError`, `useAppData`.
- Produces: `export async function saveBackupFile(b: BackupFile, now: Date): Promise<'shared' | 'downloaded' | 'cancelled'>`. Nach Erfolg wird `settings.lastBackupAt` gesetzt.

- [ ] **Step 1: Failing tests schreiben**

```ts
it('teilt die Datei, wenn der Browser Dateien teilen kann', async () => { /* navigator.canShare → true, share aufgerufen mit File 'impfpass-sicherung-….json' → 'shared' */ })
it('Abbruch im Teilen-Menü ergibt cancelled', async () => { /* share wirft DOMException 'AbortError' */ })
it('lädt herunter, wenn Teilen nicht geht', async () => { /* canShare fehlt → <a download> geklickt → 'downloaded' */ })
```

```tsx
it('kaputte Datei: Fehlermeldung, Daten unverändert', async () => {
  // Datei 'hallo' wählen → „Diese Datei ist keine ImpfPass-Sicherung.“; restore nicht aufgerufen
})
it('gültige Datei: Rückfrage, dann ersetzt', async () => {
  // Datei wählen → AlertDialog „Alle Daten auf diesem Gerät durch die Sicherung ersetzen?“ → bestätigen → restore aufgerufen
})
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. Einstellungen: Profil (Name, Geburtsdatum), „Sicherung speichern“ mit Datum der letzten Sicherung, „Sicherung wiederherstellen“, Link „Info“. Info-Seite mit diesen Texten:
  - „ImpfPass ersetzt keine ärztliche Beratung. Sprich vor einer Impfung mit deiner Ärztin oder deinem Arzt.“
  - „Deine Daten bleiben auf diesem Gerät. ImpfPass schickt nichts ins Internet. Daten verlassen das Gerät nur, wenn du es selbst auslöst, zum Beispiel beim Speichern einer Sicherung.“
  - „Die Sicherung enthält deine Impfdaten. Bewahre sie sicher auf.“
  - App-Version aus `package.json` (über `import.meta.env` per `define` in `vite.config.ts`).
  - Falls in Task 3 Code des Originals übernommen wurde: Urheberhinweis mit Link.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): add settings, backup and restore, info page`

### Task 9: Impfung eintragen, bearbeiten, löschen

**Files:**
- Create: `src/core/validation.ts`, `src/app/entry/EntryForm.tsx`, `src/app/entry/EntryDetail.tsx`, `src/app/entry/BackupHint.tsx`
- Test: `src/core/validation.test.ts`, `src/app/entry/EntryForm.test.tsx`

**Interfaces:**
- Consumes: `suggestProducts`, `getProduct`, `DISEASES`, `normalizeToPrecision`, `todayISO`, `useAppData`, `saveBackupFile` und `createBackup` (Task 8, Task 5).
- Produces:
```ts
export interface EntryInput {
  date: ISODate; datePrecision: DatePrecision; productId: string | null; label: string
  diseases: DiseaseId[]; batch?: string; doctor?: string; note?: string
}
export type EntryErrors = Partial<Record<'date' | 'product', string>>
export function validateEntry(input: EntryInput, birthDate: ISODate, today: ISODate): EntryErrors
```
Fehlertexte: „Bitte ein Datum angeben.“, „Das Datum liegt in der Zukunft.“, „Das Datum liegt vor deinem Geburtstag.“, „Bitte einen Impfstoff wählen oder mindestens eine Krankheit angeben.“
Vergleich mit dem Geburtstag auf der Ebene der Genauigkeit: Bei `year` zählt nur das Jahr, bei `month` Jahr und Monat.

- [ ] **Step 1: Failing tests schreiben**

```ts
const birth = '1967-03-15', today = '2026-11-26'
it('Zukunft', () => { expect(validateEntry({ ...base, date: '2026-11-27' }, birth, today).date).toBe('Das Datum liegt in der Zukunft.') })
it('vor Geburt', () => { expect(validateEntry({ ...base, date: '1967-03-14' }, birth, today).date).toBe('Das Datum liegt vor deinem Geburtstag.') })
it('Jahr der Geburt ist erlaubt, wenn nur das Jahr bekannt ist', () => {
  expect(validateEntry({ ...base, date: '1967-01-01', datePrecision: 'year' }, birth, today)).toEqual({})
})
it('Monat der Geburt ist erlaubt, wenn nur der Monat bekannt ist', () => {
  expect(validateEntry({ ...base, date: '1967-03-01', datePrecision: 'month' }, birth, today)).toEqual({})
})
it('ohne Impfstoff und ohne Krankheit', () => {
  expect(validateEntry({ ...base, productId: null, diseases: [] }, birth, today).product).toBeDefined()
})
```

```tsx
it('Impfstoff aus Vorschlägen wählen zeigt die Krankheiten und speichert', async () => {
  // „Boos“ tippen → Vorschlag „Boostrix Polio“ wählen → Text „Tetanus, Diphtherie, Keuchhusten, Kinderlähmung (Polio)“ sichtbar
  // speichern → saveVaccination mit productId und diseases aufgerufen, Hinweis „Sicherung speichern?“ erscheint
})
it('Freitext ohne Impfstoff verlangt Krankheiten', async () => { /* Fehlermeldung, nach Auswahl „Tetanus“ speicherbar */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. Formular: Datum (Standard heute) mit Auswahl „Tag bekannt / nur Monat / nur Jahr“, Impfstoff mit Vorschlagsliste, ohne Treffer Freitext plus Mehrfachauswahl der Krankheiten, Charge, Arzt oder Praxis, Notiz. Gespeichert wird `normalizeToPrecision(date, precision)`. Detailansicht mit „Bearbeiten“ und „Löschen“ (AlertDialog „Diese Impfung löschen?“). Nach Speichern oder Ändern erscheint `BackupHint`: „Sicherung speichern?“ mit Knopf „Jetzt sichern“ (ruft `saveBackupFile` aus Task 8) und „Später“ (Spec 12).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): add, edit and delete vaccinations`

### Task 10: Übersicht „Zuletzt geimpft“

Übergangslösung, bis Plan 2 die Empfehlungen bringt.

**Files:**
- Create: `src/app/overview/lastByDisease.ts`, `src/app/overview/OverviewScreen.tsx`
- Test: `src/app/overview/lastByDisease.test.ts`

**Interfaces:**
- Produces: `export function lastByDisease(vs: Vaccination[]): { disease: DiseaseId; last: Vaccination }[]` (Reihenfolge `DISEASE_IDS`)

- [ ] **Step 1: Failing test schreiben**

```ts
it('neueste Impfung je Krankheit, Kombi-Impfstoff zählt für jede', () => {
  // Td-pur 2010, Boostrix Polio 2020 → tetanus und diphtheria: 2020; pertussis, polio: 2020
})
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementieren. Die Übersicht zeigt je Krankheit „zuletzt geimpft am …“ und darunter: „Empfehlungen und Erinnerungen folgen in einer späteren Version.“
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: Commit** `feat(app): add interim overview with last vaccination per disease`

### Task 11: Installierbar, offline, sicher

**Files:**
- Create: `public/icon.svg`, `vite/csp.ts`, `src/app/InstallHint.tsx`, `src/app/installHint.ts`
- Modify: `vite.config.ts`, `index.html`, `package.json` (Skript `icons`)
- Test: `src/app/installHint.test.ts`

**Interfaces:**
- Produces: `export function shouldShowInstallHint(ua: string, standalone: boolean, dismissed: boolean): boolean`; `export function cspPlugin(): Plugin` (Vite, `apply: 'build'`).

- [ ] **Step 1: Failing test schreiben**

```ts
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
it('zeigt den Hinweis auf dem iPhone im Browser', () => { expect(shouldShowInstallHint(iphone, false, false)).toBe(true) })
it('nicht in der installierten App', () => { expect(shouldShowInstallHint(iphone, true, false)).toBe(false) })
it('nicht nach dem Wegklicken', () => { expect(shouldShowInstallHint(iphone, false, true)).toBe(false) })
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Implementieren:
  - `vite-plugin-pwa` mit `registerType: 'autoUpdate'`, `injectRegister: 'script'` (keine Inline-Skripte), Manifest: `name` und `short_name` „ImpfPass“, `description` „Dein Impfpass auf dem Handy“, `lang` „de“, `start_url` „/#/“, `scope` „/“, `display` „standalone“, Farben aus dem Design. Symbole mit `@vite-pwa/assets-generator` (Preset `minimal-2023`) aus `public/icon.svg`, Skript `npm run icons`.
  - `cspPlugin` fügt beim Build in `index.html` ein: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">`. Nur beim Build, weil der Dev-Server Inline-Skripte braucht.
  - `InstallHint` auf der Übersicht: „Tipp: Tippe auf Teilen und dann auf ‚Zum Home-Bildschirm‘. Dann startet ImpfPass wie eine App und deine Daten sind besser geschützt.“ Wegklicken setzt `settings.installHintDismissed`.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** `npm run build` und prüfen: `dist/manifest.webmanifest` enthält `"start_url":"/#/"` und `"display":"standalone"`; `grep -c "Content-Security-Policy" dist/index.html` → 1; `dist/sw.js` existiert. `npm run preview`, im Browser öffnen, in den DevTools „Offline“ einschalten, neu laden → App erscheint, Daten sind da, in der Konsole keine CSP-Verstöße.
- [ ] **Step 6: Commit** `feat: make the app installable and offline-capable, add CSP`

### Task 12: CI und Veröffentlichung

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md` (Adresse, Badge optional), `CLAUDE.md` (Abschnitt „Veröffentlichen“)

- [ ] **Step 1:** `pages.yml`: bei Push auf `main` und manuell. Job `test`: `actions/checkout@v5`, `actions/setup-node@v5` (Node 22, Cache npm), `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `actions/upload-pages-artifact` mit `dist`. Job `deploy` (`needs: test`, Umgebung `github-pages`, Rechte `pages: write`, `id-token: write`): `actions/deploy-pages`.
- [ ] **Step 2:** Lokal `npm run lint && npm run typecheck && npm test && npm run build` → grün.
- [ ] **Step 3: Commit** `ci: test and deploy to GitHub Pages`
- [ ] **Step 4: Mit dem Nutzer abstimmen, dann veröffentlichen.** Erst nach seinem Ja: `gh repo create impfpass/impfpass.github.io --public --source . --push`, danach Pages auf GitHub Actions stellen: `gh api -X POST repos/impfpass/impfpass.github.io/pages -f build_type=workflow`.
- [ ] **Step 5:** `gh run watch` bis zum Ende → beide Jobs grün. `curl -sI https://impfpass.github.io/` → `HTTP/2 200`.
- [ ] **Step 6: Prüfung durch den Nutzer auf dem iPhone** (Spec 13): Seite in Safari öffnen, „Zum Home-Bildschirm“, App starten, Ersteinrichtung, eine Impfung mit Impfstoff und eine nur mit Jahr eintragen, alle vier Sortierungen ansehen, Sicherung über das Teilen-Menü in „Dateien“ speichern, Flugmodus an, App neu starten → Daten und App sind da. Ergebnis in `docs/dev-log/` festhalten.
