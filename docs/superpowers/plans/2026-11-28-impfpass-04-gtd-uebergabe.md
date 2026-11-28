# ImpfPass Plan 4: GTD-Übergabe in ImpfPass – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Handy-App berechnet für jede zutreffende Empfehlung eine Erinnerung „Termin beim Arzt ausmachen“, merkt sich, was schon im GTD ist, und übergibt neue, geänderte und weggefallene Erinnerungen als Link oder als kopierbaren Text an die GTD-App des Nutzers.

**Architecture:** Der Kern bekommt reine Funktionen unter `src/core/gtd/` (Erinnerungen aus der Auswertung, Vergleich mit dem Übergabe-Stand) und das Übergabeformat in `src/core/formats/gtd.ts` (JSON, deflate, Base64url). Der Übergabe-Stand liegt im schon vorhandenen Store `gtdStates`. `AppData` hält Erinnerungen und offene Änderungen aktuell; die Oberfläche zeigt einen Hinweis auf der Übersicht und nach dem Speichern einer Impfung, eine Seite „Ins GTD übernehmen“ und die Adresse in den Einstellungen.

**Tech Stack:** wie Plan 3 (Vite 8, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, wouter, idb, zod 4, fflate, Vitest 4). Keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-11-26-impfpass-design.md`, vor allem Abschnitt 9 (ohne 9.4), dazu 6.1, 7.2, 7.4, 10, 12 und 13.

**Planreihe:** Plan 4 von 5 (Liste in Plan 1, Zeilen 13–20). Nicht in diesem Plan: die Übernahmeseite in der GTD-App (Plan 5, Repo `C:\Dev\GettingThingsDone`, Spec 9.4).

## Entscheidungen vor dem Plan

Vom Nutzer am 28.11.2026 bestätigt (Punkte 1 bis 5 vorgeschlagen, ohne Widerspruch; Punkt 6 von ihm gewählt):

1. In den Einstellungen steht die volle Adresse der Übernahmeseite aus Plan 5, etwa `https://…/de/impfpass`. ImpfPass hängt nur `#impfpass=<daten>` an und kennt den Pfad in der GTD-App nicht. Die GTD-App setzt die Sprache vor jeden Pfad (`/de/…`), die Seite gibt es noch nicht.
2. Solange eine Karte „Mit dem Arzt besprechen“ offen ist, geht die normale Erinnerung nach Alter trotzdem ins GTD (Status `discuss` mit `normalAge` und Fälligkeitsdatum). Sonst käme etwa die Gürtelrose-Erinnerung zum 60. Geburtstag nie, solange die Karte offen ist.
3. Bei Saison-Impfungen (Grippe, COVID-19) steht die Saison, etwa `2027/28`, statt des Fälligkeitsdatums in der `ref`. Ein geänderter Saison-Tag verschiebt nur die Termine.
4. Verglichen wird mit dem berechneten Erinnerungstag, bevor er auf heute vorgezogen wird. Das ersetzt das „sofort“ aus Spec 9.2 (Festlegung 16) mit demselben Zweck: Keine Erinnerung sieht täglich geändert aus, und eine Erinnerung gilt nicht als geändert, nur weil ihr Tag seit der Übergabe vorbei ist. Vorgezogen wird erst beim Erzeugen der Übergabe.
5. Der Übergabe-Stand kommt nicht in die Datensicherung; `replaceAll` leert ihn schon heute. Nach einer Wiederherstellung gilt alles einmal als offen. Das schadet nicht, weil die GTD-App doppelte `ref` erkennt (Spec 9.2).
6. Sammelaktion für offene Arztfragen (Abweichung von Spec 7.2, vom Nutzer gewählt): Die `ref` hängt an der Menge der offenen Fragen. Ändert sich die Menge, gibt es eine neue Aktion, die alte wird zurückgezogen. Grund: Die GTD-App lässt eine abgehakte Aktion unberührt (Spec 9.4), mit einer festen `ref` käme eine später hinzukommende Frage nie an.

7. Nach der Prüfung vom Nutzer gewählt (28.11.2026, Variante a): Spec 9.4 ist ergänzt. Zieht ImpfPass eine Aktion mit `cancel` zurück, vermerkt die GTD-App das; ein späteres `upsert` mit derselben `ref` stellt sie wieder her. Nur eine vom Nutzer erledigte oder gelöschte Aktion bleibt unberührt. Grund: Die `ref` ist fest, eine zurückgezogene und wiederkehrende Erinnerung ginge sonst im GTD verloren. Die `ref`-Bildung in ImpfPass bleibt unverändert; umgesetzt wird es in Plan 5.

*(Festlegungen Claude)*:

- Der Inbox-Eintrag des STIKO-Wächters (Spec 7.5, Festlegung 11) ist schon gebaut (`.github/workflows/stiko-watch.yml`, Schritt „GTD-Inbox benachrichtigen“). Es fehlen nur die Repo-Secrets `GTD_INBOX_URL` und `GTD_INBOX_TOKEN`, die der Nutzer selbst setzt. Plan 4 ändert daran nichts.
- Keine eigene Design-Datei: Abschnitt 9 der Spec ist das Design, die Entscheidungen stehen hier wie in Plan 2 und 3.
- Hash: SHA-256, selbst geschrieben und synchron, weil `crypto.subtle` nur asynchron rechnet und der Vergleich beim Rendern läuft. Geprüft gegen `node:crypto`. `ref` = `ip-` plus die ersten 16 Hex-Zeichen von SHA-256 über `JSON.stringify([personId, recommendationId, dose, due])`. Die zufällige Personen-Kennung macht die `ref` undurchsichtig.
- Erinnerungstage (Spec 9.1): normal Fälligkeit minus Vorlauf; Folgedosis Fälligkeit minus 28 Tage; Saison am Saison-Tag, in der ersten Saison aber nicht früher als 28 Tage vor einem späteren frühesten Termin (60. Geburtstag mitten in der Saison, COVID-19 mit 6 Monaten Abstand). Die Saisons ergeben sich aus dem Fälligkeitsdatum, drei ab der Saison, in die es fällt.
- Die Sammelaktion trägt den Tag „sofort“ und wird mit dem Tag der Übergabe übergeben.
- Der Hinweis zählt neue, geänderte und zurückzuziehende Erinnerungen zusammen: „2 Erinnerungen noch nicht im GTD“ (Skizze in Spec 6.1).
- Seite unter `#/gtd`. Als übergeben gilt eine Erinnerung, sobald der Link angetippt oder der Text kopiert ist (Spec 9.2). Klappt das Kopieren nicht, erscheint der Text zum Markieren mit „Ich habe den Text kopiert“.
- Adresse: `https://`, für Tests mit der GTD-App am PC auch `http://localhost` und `http://127.0.0.1`. Ein `#`-Teil der eingegebenen Adresse wird ersetzt.
- `copyText` zieht von `src/import/` nach `src/lib/`, weil die Handy-App nichts aus `src/import/` importiert.

## Global Constraints

- Zur Laufzeit keine Anfragen an Dritte. Die Übergabe ist eine Navigation oder ein Kopieren, das der Anwender auslöst; ImpfPass schickt selbst nichts (Spec 5, 12).
- Gesundheitsdaten verlassen das Gerät nur auf ausdrücklichen Wunsch, und die App sagt, wohin sie gehen (Spec 12).
- Nur die Handy-App berechnet und übergibt Erinnerungen (Spec 9.2). `src/import/` nutzt nichts aus `src/core/gtd/`.
- Übergabeformat Version 1 wie in Spec 9.3: `format: "impfpass-gtd"`, `version: 1`, `created` (ISO-Zeitstempel), `items` mit `op: "upsert"` (`ref`, `title`, `date`, `time: null`, `description`, `checklist`) oder `op: "cancel"` (`ref`). Link `<Adresse>#impfpass=<daten>`, Text `IMPFPASS-GTD:1:<daten>`, `<daten>` = Base64url ohne `=` von deflate über UTF-8-JSON.
- Die Bildung der `ref` ändert sich nie mehr, sobald echte Übergaben passiert sind; sonst entstehen im GTD doppelte Aktionen. Texte dürfen sich ändern, das führt nur zu einem erneuten `upsert`.
- Voreinstellungen: Vorlauf 6 Monate, Saison-Tag `09-01` (Spec 9.1).
- Oberfläche nur Deutsch, sachlich, Du-Form. Alle Texte, auch die der übergebenen Aktionen, stehen in `src/texts.ts`.
- Der Kern (`src/core/`) importiert nichts aus `src/app/`, `src/import/`, `src/components/`, `react` oder `react-dom` (`src/core/boundaries.test.ts`).
- Kalenderdaten sind Strings `YYYY-MM-DD`, gerechnet wird mit `src/core/dates.ts`.
- Gut lesbar auch für Ältere: Grundschrift 18 px, Bedienflächen mindestens 44 × 44 px, helles und dunkles Design (Spec 14).
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`).
- Bezeichner englisch, Texte deutsch. TDD: erst der rote Test.
- Vor jedem Commit `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` grün. Commits im Stil `feat: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nur eigene Dateien einzeln per Pfad stagen.

## Review Focus

1. Die App bleibt über Nacht offen oder wird Wochen später geöffnet: Erinnerungen, deren Tag inzwischen vorbei ist, gelten nicht als geändert, der Hinweis kommt nicht täglich wieder. Test in Task 3.
2. Die Zwischenablage ist gesperrt (iPhone, fehlende Berechtigung): Der Text erscheint markiert, und „Ich habe den Text kopiert“ schließt die Übergabe ab. Test in Task 6.
3. Die Adresse ist falsch eingegeben (ohne `https://`, mit Leerzeichen, mit `#`-Teil, `http://` zu einem fremden Server): Die Einstellungen sagen, was fehlt, ein `#`-Teil wird ersetzt. Tests in Task 3 und Task 5.
4. Das Speichern des Übergabe-Stands schlägt nach Link oder Kopieren fehl: Die App sagt es, die Änderungen bleiben offen, eine zweite Übergabe schadet nicht. Test in Task 6.
5. Nach einer Wiederherstellung oder bei einem unlesbaren gespeicherten Übergabe-Stand gilt alles einmal als offen, ohne Fehlerseite. Tests in Task 4.

---

### Task 1: SHA-256 und Base64url

**Files:**
- Create: `src/core/formats/sha256.ts`, `src/core/formats/base64url.ts`, je mit Test

**Interfaces:**
- Produces: `sha256Hex(text: string): string` (UTF-8, 64 Hex-Zeichen klein) und `toBase64Url(bytes: Uint8Array): string` (Alphabet `A-Za-z0-9-_`, ohne `=`).

- [ ] **Step 1: Tests schreiben:**
  - `sha256Hex("")` → `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
  - `sha256Hex("abc")` → `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`
  - `sha256Hex("Gürtelrose")` → `da7661bb0f32f39659771e19f189ee52b3d73b628843e0ca26f1053e2180cd90`
  - Für jede Länge 0 bis 200 (Zeichen `"a".repeat(n)`, dazu `"ä".repeat(n)`) gleich `createHash("sha256").update(s, "utf8").digest("hex")` aus `node:crypto`. Deckt die Blockgrenzen bei 55, 56 und 64 Byte ab.
  - `toBase64Url(new Uint8Array([]))` → `""`, `[0xfb, 0xff]` → `"-_8"`, `[0, 0, 0]` → `"AAAA"`, `[0xfa]` → `"-g"`; für 1000 Zufallsbytes gleich `Buffer.from(bytes).toString("base64url")`.
- [ ] **Step 2:** `npx vitest run src/core/formats/sha256 src/core/formats/base64url` → rot.
- [ ] **Step 3:** Implementieren. SHA-256 nach FIPS 180-4 mit `TextEncoder` und `Uint32Array`, ohne Bibliothek. Base64url über `btoa` auf einem Binärstring in Stücken von 32 KB, dann `+` → `-`, `/` → `_`, `=` weg.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(core): sha-256 and base64url helpers`.

### Task 2: Erinnerungen aus der Auswertung

**Files:**
- Create: `src/core/gtd/reminders.ts`, Test `src/core/gtd/reminders.test.ts`, Testhilfe `src/test/gtd.ts`
- Modify: `src/core/rules/season.ts` (`label` als `seasonLabel` exportieren), `src/texts.ts` (`T.gtd.items`, `T.gtd.questions`)

**Interfaces:**
- Consumes: `sha256Hex` (Task 1), `Recommendation` aus `src/core/rules/types.ts`, `addDays`, `addMonths`, `formatDate`.
- Produces:
  - `seasonLabel(year: number): string` in `season.ts` (`2027` → `"2027/28"`, `2099` → `"2099/00"`).
  - `interface GtdReminder { ref: string; day: ISODate | null; title: string; description: string; checklist: string[] }`. `day` ist der berechnete Erinnerungstag vor dem Vorziehen auf heute, `null` heißt sofort.
  - `remindersFor(input: { personId: string; recommendations: Recommendation[]; leadMonths: number; seasonDay: string }): GtdReminder[]`, sortiert nach `day` (sofort zuerst), dann `ref`.
  - Testhilfe `rec(overrides: Partial<Recommendation> & Pick<Recommendation, "id">): Recommendation` mit `status: "future"`, `dueDate: null`, `latestDate: null`, `dose: null`, `timing: "normal"`, `reason: { kind: "none" }`, `source: eb4(1, "Test")`, `diseases: []`.

Welche Empfehlung welche Erinnerung ergibt:

| Status, Zeitpunkt | Erinnerungen |
|---|---|
| `protected`, `soon`, `due`, `overdue`, `future` mit `timing: "normal"` und `dueDate` | eine, Tag `addMonths(dueDate, -leadMonths)`, Schlüssel `[id, dose?.number ?? null, dueDate]` |
| `due`, `overdue` mit `timing: "normal"` ohne `dueDate` | eine, Tag `null`, Schlüssel `[id, dose?.number ?? null, null]` |
| dieselben Status mit `timing: "follow_up"` | eine, Tag `addDays(dueDate, -28)`, Schlüssel `[id, dose.number, dueDate]` |
| dieselben Status mit `timing: "season"` | drei, je Saison Schlüssel `[id, null, seasonLabel(S)]` |
| `discuss` mit `reason.normalAge !== null` und `dueDate` | wie `future` mit derselben `timing` (Entscheidung 2), dazu ein Platz in der Sammelaktion |
| `discuss` sonst | nur ein Platz in der Sammelaktion |
| alle übrigen, etwa `not_applicable`, `declined`, `not_needed`, `protected` ohne `dueDate` | keine |

Saisons: Erstes Saisonjahr `Y` aus `d = dueDate`: `Y = Jahr(d)`, wenn `d >= Jahr(d)-seasonDay` oder `d > Jahr(d)-03-31`, sonst `Jahr(d) - 1`. Saisons `Y`, `Y+1`, `Y+2`; Tag `S-seasonDay`, nur in der ersten Saison `max(Y-seasonDay, addDays(d, -28))`, wenn `d` nach dem Saisonbeginn liegt.

Sammelaktion (Entscheidung 6): Schlüssel `["doctor-questions", ids]` mit den nach ID sortierten Empfehlungs-IDs aller `discuss`-Empfehlungen, Tag `null`.

Texte in `T.gtd` (Spec 9.1, `name` aus `T.rec.names`, Datum mit `formatDate(…, "day")`):
- Titel: `Impfung gegen ${name}${detail}: Termin beim Arzt ausmachen`, `detail` `, ${n}. Dosis` bei einer Dosis, sonst `, Auffrischung` bei `reason.kind === "booster"`, bei Saison `, Saison ${label}`, sonst leer.
- Beschreibung: Anfang plus ` laut STIKO, Stand ${source.edition}.` Anfang: `Fällig ab ${d} (${age}. Geburtstag)` bei `reason.kind === "age"` oder `discuss` mit `normalAge`; `Fällig ab ${d}`; `Jetzt fällig` ohne Datum; Folgedosis `Frühestens ab ${d}` und gegebenenfalls `, spätestens bis ${latest}`; Saison `Jährliche Impfung für die Saison ${label}` und in der ersten Saison mit späterem frühestem Termin `, frühestens ab ${d}`.
- Checkliste: `Termin beim Arzt ausmachen`, `Termin als Kalender-Aktion eintragen, Impfpass mitnehmen`, `Nach der Impfung in ImpfPass eintragen`.
- Sammelaktion: Titel `Beim nächsten Arztbesuch nach Impfungen fragen`, Beschreibung `Die STIKO empfiehlt diese Impfungen bei manchen Erkrankungen früher oder zusätzlich. Ob das für dich gilt, entscheidet deine Ärztin oder dein Arzt.`, Checkliste je Frage nach Namen sortiert (`localeCompare(…, "de")`): `${name} schon jetzt?` (Thema `chronic` mit `normalAge`), `${name} wegen meiner Erkrankung?` (`chronic` ohne `normalAge`), `${name}: Bluttest, ob ich geschützt bin?` (`serology`), zuletzt `Antworten in ImpfPass eintragen`.

- [ ] **Step 1: Tests schreiben** (Person `p1`, Vorlauf 6, Saison-Tag `09-01`, sofern nicht anders genannt):
  - Spec-Beispiel über die echte Auswertung: `remindersFor` auf `evaluate(person("1967-03-01"), [], [], "2026-11-28", RULEBOOK, …)` enthält Titel `Impfung gegen Gürtelrose, 1. Dosis: Termin beim Arzt ausmachen` mit `day: "2026-09-01"` und Beschreibung `Fällig ab 01.03.2027 (60. Geburtstag) laut STIKO, Stand Epid Bull 4/2026.`; alle `ref` verschieden und im Muster `/^ip-[0-9a-f]{16}$/`.
  - Auffrischung: `td`, `protected`, `dueDate: "2030-05-04"`, `reason: { kind: "booster", … }` → Tag `2029-11-04`, Titel `Impfung gegen Tetanus und Diphtherie, Auffrischung: Termin beim Arzt ausmachen`, Checkliste mit den drei Punkten. Mit Vorlauf 3: Tag `2030-02-04`, dieselbe `ref`.
  - Folgedosis: `zoster`, `soon`, `follow_up`, Dosis 2 von 2, `dueDate: "2027-01-10"`, `latestDate: "2027-05-10"` → Tag `2026-12-13`, Beschreibung beginnt mit `Frühestens ab 10.01.2027, spätestens bis 10.05.2027 laut STIKO`.
  - Sofort: `td`, `due`, Dosis 1 von 3, ohne `dueDate` → Tag `null`, Beschreibung beginnt mit `Jetzt fällig laut STIKO`.
  - Saison: `influenza`, `protected`, `dueDate: "2027-09-01"` → drei Erinnerungen mit Tagen `2027-09-01`, `2028-09-01`, `2029-09-01` und Titeln mit `Saison 2027/28`, `2028/29`, `2029/30`. Mit Saison-Tag `10-01` und `dueDate: "2027-10-01"`: dieselben drei `ref`, Tage am 1. Oktober.
  - Saison mit späterem frühestem Termin: `covid19`, `soon`, `dueDate: "2026-11-15"` → erster Tag `2026-10-18`, Beschreibung `… Saison 2026/27, frühestens ab 15.11.2026 laut STIKO …`; dann `2027-09-01`, `2028-09-01`. `influenza`, `future`, `reason: { kind: "age", age: 60 }`, `dueDate: "2046-01-15"` → Saisons `2045/46` (Tag `2045-12-18`), `2046/47`, `2047/48`.
  - `ref` ändert sich mit anderem `dueDate`, anderer Dosis und anderer `personId`, nicht mit anderer Reihenfolge der Empfehlungen.
  - Keine Erinnerung für `not_applicable`, `declined`, `not_needed` und `protected` ohne `dueDate`.
  - Offene Karte: `zoster`, `discuss`, `dueDate: "2027-03-01"`, Dosis 1 von 2, `reason: { kind: "discuss", topic: "chronic", normalAge: 60 }` ergibt eine Erinnerung mit derselben `ref` wie `future` mit `reason: { kind: "age", age: 60 }` und demselben Datum, dazu die Sammelaktion.
  - Sammelaktion aus `discuss` für `zoster` (chronic, 60), `hepatitis_b` (chronic, ohne Alter) und `varicella` (serology, ohne `dueDate`): eine Erinnerung mit Tag `null`, Checkliste `["Gürtelrose schon jetzt?", "Hepatitis B wegen meiner Erkrankung?", "Windpocken: Bluttest, ob ich geschützt bin?", "Antworten in ImpfPass eintragen"]`; ohne `hepatitis_b` eine andere `ref`; ohne `discuss` keine Sammelaktion.
  - Reihenfolge: sofort zuerst, dann nach Tag.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. `ref` = `"ip-" + sha256Hex(JSON.stringify([personId, ...schluessel])).slice(0, 16)`.
- [ ] **Step 4:** Tests grün (auch `src/core/rules/season.test.ts`), Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(core): compute GTD reminders from recommendations`.

### Task 3: Übergabe-Stand und Übergabeformat

**Files:**
- Create: `src/core/gtd/handover.ts`, `src/core/formats/gtd.ts`, je mit Test
- Modify: `src/core/model.ts` (`GtdState`), `src/core/formats/schemas.ts` (`gtdStateSchema`), `src/test/gtd.ts` (`decodeGtdData`), `CLAUDE.md`

**Interfaces:**
- Consumes: `GtdReminder`, `sha256Hex`, `toBase64Url`, `deflateSync` aus `fflate`.
- Produces:
  - In `model.ts`: `interface GtdHandedOver { ref: string; contentHash: string; at: string }` und `interface GtdState { personId: string; handedOver: GtdHandedOver[] }`; in `schemas.ts` `gtdStateSchema` (`ref` im Muster `^ip-[0-9a-f]{16}$`, `at` als `timestampSchema`).
  - In `formats/gtd.ts`: `type GtdItem = { ref: string; op: "upsert"; title: string; date: ISODate; time: null; description: string; checklist: string[] } | { ref: string; op: "cancel" }`, `interface GtdPayload { format: "impfpass-gtd"; version: 1; created: string; items: GtdItem[] }`, `GTD_TEXT_PREFIX = "IMPFPASS-GTD:1:"`, `encodeGtdData(p: GtdPayload): string`, `gtdLink(address: string, p: GtdPayload): string`, `gtdText(p: GtdPayload): string`, `normalizeGtdAddress(raw: string): string | null | "invalid"`.
  - In `gtd/handover.ts`: `interface GtdChanges { upserts: GtdReminder[]; cancels: string[] }`, `contentHash(r: GtdReminder): string` (16 Hex-Zeichen über `JSON.stringify([day, title, description, checklist])`), `pendingChanges(reminders: GtdReminder[], state: GtdState | null): GtdChanges`, `applyHandover(state: GtdState | null, personId: string, changes: GtdChanges, at: string): GtdState`, `buildPayload(changes: GtdChanges, today: ISODate, now: Date): GtdPayload`.
  - Testhilfe `decodeGtdData(data: string): GtdPayload` (Base64url zurück, `inflateSync`, `JSON.parse`).

- [ ] **Step 1: Tests schreiben** (Erinnerungen über `remindersFor` und `rec` aus Task 2):
  - Ohne Stand sind alle Erinnerungen `upserts`, keine `cancels`. Mit `applyHandover(null, "p1", changes, at)` als Stand gibt es keine Änderungen mehr.
  - Vorlauf von 6 auf 3: genau diese Erinnerung ist ein `upsert`, gleiche `ref`.
  - Spec 13, `cancel` bei geändertem Datum: `td` von `dueDate: "2030-05-04"` auf `"2036-05-04"` (neue Impfung) ergibt einen `upsert` mit neuer `ref` und einen `cancel` der alten.
  - Review Focus 1: Ein Stand nach einer Übergabe am `2026-11-28` mit einem Erinnerungstag `2026-12-01` hat auch mit den Erinnerungen vom `2027-01-15` keine Änderungen (`pendingChanges` hängt nicht vom Tag ab).
  - Stand einer anderen Person zählt wie kein Stand.
  - `applyHandover` übernimmt `upserts` mit `at`, entfernt `cancels`, lässt den Rest samt altem `at` stehen.
  - `buildPayload`: `format`, `version: 1`, `created` = `now.toISOString()`; `upserts` in ihrer Reihenfolge, danach `cancels` als `{ ref, op: "cancel" }`; `date` = `today` bei Tag `null` oder vor `today`, sonst der Tag; `time: null`.
  - `gtdText(p)` beginnt mit `IMPFPASS-GTD:1:`, der Rest passt auf `/^[A-Za-z0-9_-]+$/`, `decodeGtdData` ergibt `p` wieder, auch mit Umlauten und `≥` im Titel.
  - `gtdLink("https://gtd.example/de/impfpass", p)` ist `https://gtd.example/de/impfpass#impfpass=` plus `encodeGtdData(p)`; mit `…/impfpass#alt` wird der `#`-Teil ersetzt.
  - Review Focus 3: `normalizeGtdAddress`: `"  https://gtd.example/de/impfpass  "` → `"https://gtd.example/de/impfpass"`, `"https://gtd.example/x#y"` → `"https://gtd.example/x"`, `"http://localhost:3000/de/impfpass"` und `"http://127.0.0.1:3000/x"` bleiben, `""` und `"   "` → `null`, `"gtd.example"`, `"http://gtd.example/x"` und `"ftp://gtd.example"` → `"invalid"`.
  - `gtdStateSchema` nimmt einen Stand aus `applyHandover` an und lehnt eine `ref` ohne `ip-` ab.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. `encodeGtdData` = `toBase64Url(deflateSync(new TextEncoder().encode(JSON.stringify(p)), { level: 9 }))`. `gtdLink` setzt `url.hash` über `new URL(address)`.
- [ ] **Step 4:** In `CLAUDE.md` unter „Ordner“ `src/core/gtd/` und `src/app/gtd/` ergänzen, unter „Regeln“: „GTD-Übergabeformat (`src/core/formats/gtd.ts`): Die Bedeutung von Version 1 ändert sich nie. Die Bildung der `ref` in `src/core/gtd/reminders.ts` bleibt, wie sie ist, sonst entstehen im GTD doppelte Aktionen. Geänderte Texte sind erlaubt, sie führen nur zu einem erneuten `upsert`.“ und den aktuellen Plan auf Plan 4 setzen.
- [ ] **Step 5:** Tests grün, Lint, Typecheck.
- [ ] **Step 6:** Commit `feat(core): GTD handover state and transfer format`.

### Task 4: Speicher und App-Daten

**Files:**
- Modify: `src/core/storage/db.ts` (Platzhalter `GtdState` durch den aus `model.ts` ersetzen), `src/core/storage/repository.ts`, `src/app/data/AppData.tsx`, `src/test/helpers.tsx` (`seed` mit `gtdStates`)
- Test: `src/core/storage/repository.test.ts`, `src/app/data/AppData.test.tsx`

**Interfaces:**
- Consumes: `GtdState`, `gtdStateSchema`, `remindersFor`, `pendingChanges`, `applyHandover`.
- Produces:
  - `Repository.getGtdState(personId: string): Promise<GtdState | null>` (unlesbar → `null`) und `Repository.saveGtdState(s: GtdState): Promise<void>`.
  - In `AppData`: `gtd: { reminders: GtdReminder[]; changes: GtdChanges }` (ohne Person leer, per `useMemo` stabil) und `actions.markHandedOver(changes: GtdChanges): Promise<void>` (speichert erst, dann Zustand).

- [ ] **Step 1: Tests schreiben:**
  - Repository: Stand speichern und lesen; ein gespeicherter Eintrag `{ personId: "p1", handedOver: "kaputt" }` ergibt `null` (Review Focus 5); `replaceAll` leert `gtdStates`.
  - AppData mit Testperson ohne Impfungen: `gtd.changes.upserts` nicht leer, `cancels` leer. Nach `markHandedOver(gtd.changes)` sind die Änderungen leer, und ein neu gerenderter Provider liest denselben Stand aus der Datenbank.
  - Eine neue Impfung, die eine Fälligkeit verschiebt, ergibt danach `upserts` und `cancels`.
  - Nach `restore` einer Sicherung gilt alles wieder als offen (Review Focus 5).
  - Schlägt `saveGtdState` fehl, wirft `markHandedOver`, und `gtd.changes` bleibt unverändert.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. `loadAll` lädt `gtdState` mit; `createPerson` und `restore` setzen ihn wie den Regel-Stand zurück.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: keep GTD handover state per person`.

### Task 5: Adresse in den Einstellungen

**Files:**
- Modify: `src/app/settings/SettingsScreen.tsx`, `src/texts.ts` (`T.settings.gtd…`)
- Test: `src/app/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `normalizeGtdAddress` (Task 3), `actions.saveSettings`.

Neuer Abschnitt nach „Erinnerungen“: Überschrift `GTD-Übergabe`, Feld `Adresse der Übernahmeseite` (`type="url"`, `inputMode="url"`, `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`), Hilfe `Die Adresse der Seite in deiner GTD-App, die Erinnerungen von ImpfPass übernimmt. Ohne Adresse ist die Übergabe ausgeschaltet.`, Knopf `Adresse speichern`, Fehler `Bitte gib eine vollständige Adresse ein, die mit https:// beginnt.`, danach `Gespeichert.` (`T.settings.saved`). Mit Adresse steht darunter ein Link `Ins GTD übernehmen` auf `#/gtd`.

- [ ] **Step 1: Tests schreiben:** `  https://gtd.example/de/impfpass ` speichern → `settings.gtdUrl` ist `https://gtd.example/de/impfpass`; `gtd.example` → Fehlermeldung am Feld (`aria-invalid`, `aria-describedby`), nichts gespeichert; leeres Feld bei gespeicherter Adresse → `gtdUrl` entfällt; mit Adresse erscheint der Link `Ins GTD übernehmen`.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. Ohne Adresse wird `gtdUrl` aus dem Objekt gelöscht, nicht auf `""` gesetzt.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: GTD address in the settings`.

### Task 6: Seite „Ins GTD übernehmen“

**Files:**
- Create: `src/app/gtd/GtdScreen.tsx`, Test `src/app/gtd/GtdScreen.test.tsx`
- Move: `src/import/copyText.ts` und Test nach `src/lib/copyText.ts`; Importe in `src/import/GuideStep.tsx` und `src/import/TransferStep.tsx` anpassen
- Modify: `src/app/App.tsx` (Route `/gtd`), `src/texts.ts` (`T.gtd.screen`)

**Interfaces:**
- Consumes: `gtd`, `settings.gtdUrl`, `today`, `actions.markHandedOver` (Task 4), `buildPayload` (Task 3), `gtdLink`, `gtdText`, `copyText(text, fallback)`.

Aufbau: Überschrift `Ins GTD übernehmen`. Ohne Adresse: `Trag in den Einstellungen die Adresse deiner GTD-App ein, dann kannst du Erinnerungen übergeben.` mit Link `Zu den Einstellungen`. Ohne Änderungen: `Dein GTD ist auf dem neuesten Stand.` Sonst:
- `Die Erinnerungen enthalten, welche Impfung wann fällig ist. Mit dem Link gehen sie an deine GTD-App unter ${host}, beim Kopieren in die Zwischenablage.`
- Liste der `upserts` mit Titel und `am ${Datum}` oder `heute` (Tag `null` oder vor heute); bei `cancels` `1 Erinnerung entfällt und wird im GTD zurückgezogen.` bzw. `${n} Erinnerungen entfallen und werden im GTD zurückgezogen.`
- Knopf `Link öffnen` als `<a href={link} target="_blank" rel="noreferrer">`, Klick ruft `markHandedOver` auf, danach `Der Link ist geöffnet. Bestätige die Übernahme in deiner GTD-App.`
- Knopf `Text kopieren`: Erfolg → `markHandedOver`, danach `Kopiert. Füge den Text jetzt in deiner GTD-App ein.`; Fehler → `Kopieren hat nicht geklappt. Markiere den Text und kopiere ihn selbst.`, ein schreibgeschütztes Textfeld mit dem Text (markiert) und der Knopf `Ich habe den Text kopiert`, der `markHandedOver` aufruft.
- Hinweis `Auf dem iPhone kopierst du den Text und fügst ihn in der GTD-App vom Home-Bildschirm ein. Ein Link öffnet sich dort in Safari.`
- Die Übergabe wird einmal je Stand der Änderungen erzeugt (`useMemo` über `gtd.changes` und `today`), Link und Text enthalten dieselben Daten wie das, was danach als übergeben gilt.

- [ ] **Step 1: Tests schreiben** (`renderWithData` mit `today: "2026-11-28"`, Einstellungen mit `gtdUrl: "https://gtd.example/de/impfpass"`):
  - Der Link beginnt mit `https://gtd.example/de/impfpass#impfpass=`, `decodeGtdData` des Fragments enthält alle `upserts` als Einträge; nach dem Klick ist `data().gtd.changes` leer und die Bestätigung zu sehen.
  - Kopieren (`navigator.clipboard.writeText` gemockt): aufgerufen mit einem Text, der mit `IMPFPASS-GTD:1:` beginnt, danach `Kopiert. …` und keine Änderungen mehr.
  - Review Focus 2: `writeText` lehnt ab → Textfeld mit demselben Text, nichts übergeben; `Ich habe den Text kopiert` übergibt.
  - Review Focus 4: `saveGtdState` schlägt fehl → `T.common.saveFailed` als `role="alert"`, Änderungen bleiben.
  - Ohne Adresse der Hinweis mit Link auf die Einstellungen; ohne Änderungen `Dein GTD ist auf dem neuesten Stand.`
  - `src/lib/copyText.test.ts` läuft am neuen Ort unverändert; `src/core/boundaries.test.ts` bleibt grün.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün (auch die der PC-App), Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: page to hand reminders over to the GTD app`.

### Task 7: Hinweise in Übersicht und nach dem Speichern

**Files:**
- Create: `src/app/gtd/GtdBanner.tsx`
- Modify: `src/app/overview/OverviewScreen.tsx` (nach `NoticeBanner`), `src/app/entry/EntryForm.tsx` (nach `BackupHint`), `src/texts.ts` (`T.gtd.pending`, `T.gtd.open`, `T.info.privacy`)
- Test: `src/app/overview/OverviewScreen.test.tsx`, `src/app/entry/EntryForm.test.tsx`, `src/app/settings/InfoScreen.test.tsx`

**Interfaces:**
- Consumes: `gtd.changes`, `settings.gtdUrl`.
- Produces: `GtdBanner()` ohne Props; zeigt nichts ohne Adresse oder ohne Änderungen, sonst `1 Erinnerung noch nicht im GTD` bzw. `${n} Erinnerungen noch nicht im GTD` (n = `upserts` + `cancels`) und einen Knopf-Link `Ins GTD übernehmen` auf `/gtd`.

`T.info.privacy` wird zu: `Deine Daten bleiben auf diesem Gerät. ImpfPass schickt nichts ins Internet. Daten verlassen das Gerät nur, wenn du es selbst auslöst, zum Beispiel beim Speichern einer Sicherung oder bei der Übergabe ans GTD.`

- [ ] **Step 1: Tests schreiben:** Übersicht mit Adresse und offenen Änderungen zeigt den Hinweis mit Zahl und einen Link auf `#/gtd`; ohne Adresse oder nach `markHandedOver` kein Hinweis. Nach dem Speichern einer neuen Impfung, die eine Erinnerung ändert, erscheint der Hinweis unter dem Sicherungsangebot. Die Info-Seite nennt die Übergabe ans GTD.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck, `npm run build`.
- [ ] **Step 5:** Commit `feat: show pending GTD reminders`.

### Task 8: Prüfung von Hand

Die Übernahme selbst prüft Plan 5. Hier geht es um die ImpfPass-Seite. Schritt 1 läuft lokal, Schritt 2 erst nach dem Push, und gepusht wird nur nach ausdrücklichem Ja des Nutzers.

- [ ] **Step 1:** Am PC (`npm run preview`): Adresse eintragen, Hinweis auf der Übersicht, Seite öffnen, `Link öffnen` landet auf der Adresse mit `#impfpass=…`, der Hinweis ist weg. Eine Impfung eintragen, Hinweis erscheint wieder mit den geänderten Erinnerungen.
- [ ] **Step 2:** Auf dem iPhone in der App vom Home-Bildschirm: `Text kopieren` klappt, in Notizen eingefügt beginnt der Text mit `IMPFPASS-GTD:1:`. `Link öffnen` öffnet Safari. Schriftgröße und Bedienflächen passen.
- [ ] **Step 3:** Ergebnis hier abhaken und mit `docs: plan 4 checks on the iPhone` committen.
