# ImpfPass Plan 3: PC-Import und QR-Übertragung – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alte Impfungen aus dem Papierpass kommen über den PC aufs Handy. Am PC unter `https://impfpass.github.io/import/` liest ein Chatbot die Fotos, der Anwender prüft das Ergebnis in einer großen Tabelle und überträgt es mit QR-Codes, als Datei oder als Text in die Handy-App.

**Architecture:** Der Kern bekommt reine, getestete Bausteine für Passdaten, Chatbot-Antworten, den Entwurf mit seinen Prüfungen, das Übertragungsformat (deflate, Base45, QR-Teile mit Prüfsumme), die Dubletten-Regel und das Zusammenführen. Die PC-App ist eine zweite Einstiegsseite im selben Vite-Build (`import/index.html`, Code unter `src/import/`) mit eigenem Manifest und einer eigenen kleinen Datenbank für den Entwurf. Die Handy-App bekommt die Seite „Impfungen übernehmen“ mit Kamera-Scan, Datei, Text und Vorschau, dazu die Wahl in der Ersteinrichtung.

**Tech Stack:** wie Plan 2 (Vite 8, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, wouter, idb, zod 4, Vitest 4). Neu: `fflate` 0.8.3 (MIT) für deflate, `qrcode` 1.5.4 (MIT) mit `@types/qrcode` 1.5.6 zum Erzeugen der QR-Codes, `jsqr` 1.4.0 (Apache-2.0) zum Lesen, dazu der shadcn-Baustein `dialog`.

**Spec:** `docs/superpowers/specs/2026-11-26-impfpass-design.md`, vor allem die Abschnitte 5, 6.1, 6.2, 8, 11, 12 und 13.

**Planreihe:** Plan 3 von 5 (Liste in Plan 1, Zeilen 13–20). Nicht in diesem Plan: Erinnerungen und GTD-Übergabe (Plan 4), Übernahmeseite in der GTD-App (Plan 5).

## Entscheidungen vor dem Plan

- Lizenz (geprüft am 27.11.2026 mit `gh issue view 1 --repo Nockchlhas/Impfbuch` und `gh api repos/Nockchlhas/Impfbuch`): Das Original hat weiter keine Lizenz, Issue #1 ist offen und unbeantwortet. Anleitung für den Chatbot, Parser und Namenserkennung entstehen selbst. Nur das Ausgabeformat folgt dem Muster aus der Spec (8.1), das dort beschrieben ist.
- Umfang *(Festlegung Claude)*: Die zurückgestellten Punkte aus Plan 2 gehören nicht in Plan 3: Angaben für Personen aus Plan 1, eine Runde zur Barrierefreiheit, Testlücken, veraltete Tabellen in Plan 2, die vier offenen STIKO-Punkte, Hepatitis A und MenACWY. Sie stehen in `impfpass-plan2-ledger.md` im Notizordner der Sitzungen und bekommen eigene Arbeit.
- Bibliotheken (Spec 17, Versionen und Lizenzen am 27.11.2026 mit `npm view` geprüft): `fflate` packt synchron und in jedem Browser, `CompressionStream` gibt es auf dem iPhone erst ab iOS 16.4 und nur asynchron. `qrcode` liefert mit `QRCode.create` die Matrix, die App zeichnet sie selbst als SVG. `jsqr` liest QR-Codes aus Kamerabildern; Safari auf dem iPhone kennt `BarcodeDetector` nicht.
- Kodierung *(Festlegung Claude)*: Die Einträge werden als kompaktes JSON (Arrays, Voreinstellungen weggelassen) mit deflate gepackt und in Base45 (RFC 9285) geschrieben. Base45 nutzt nur Zeichen des alphanumerischen QR-Modus und übersteht Kopieren und Einfügen. Eine Teilzeile sieht so aus: `IP:1:2/3:K7Q2M9:<Base45>:9F2C1A0B` (Kennung, Version, Teil/Gesamt, Übertragungs-ID, Daten, CRC-32 über das Ganze). Die Prüfsumme steht am Ende, damit kein Leerzeichen am Zeilenende verloren gehen kann. Je Code höchstens 700 Datenzeichen, Fehlerkorrektur M. Für Datei und Text ist es dieselbe Zeile, als ein einziger Teil ohne Längengrenze.
- Dubletten (Auslegung von Spec 8.1 „gleiches Datum und überlappende Krankheit“): Zwei Daten gelten als gleich, wenn sie in der gröberen der beiden Genauigkeiten übereinstimmen. „12.2016“ und „05.12.2016“ sind also möglicherweise dieselbe Impfung. Eine Dublette ist nur ein Hinweis; am Handy ist sie in der Vorschau abgewählt und lässt sich wieder anwählen.
- Entwurf am PC *(Festlegung Claude)*: Er liegt in einer eigenen IndexedDB-Datenbank `impfpass-import`. PC-App und Handy-App teilen sich die Domain, die PC-App fasst die Datenbank der Handy-App aber nicht an.
- Fehler und Hinweise in der Tabelle *(Festlegung Claude)*: Fehler sperren die Übertragung (Datum fehlt, unlesbar, in der Zukunft oder vor dem Geburtsdatum, keine Krankheit). Hinweise sperren nicht (Impfstoff unscharf erkannt, mehrdeutig oder nicht in der Liste, vom Chatbot unsicher gelesen, möglicherweise doppelt). Ein Häkchen „Hinweise geprüft“ blendet die Hinweise einer Zeile aus. Sind beim Übertragen noch Hinweise offen, fragt ein Dialog nach.
- QR-Codes am PC *(Festlegung Claude)*: einer nach dem anderen, groß, mit „Vorheriger Code“ und „Nächster Code“. Das Handy nimmt sie in beliebiger Reihenfolge.
- Lizenztexte der mitgelieferten Bibliotheken liegen dem Build bisher nicht bei. Das betrifft React und alle übrigen Pakete genauso wie `jsqr` und ist eine eigene kleine Aufgabe nach diesem Plan.
- Wunsch des Nutzers (27.11.2026): Felder für Arzt oder Praxis werden nicht autokorrigiert. In der Handy-App ist das mit Commit 59eb8ff erledigt, für die PC-App und die Charge steht es unten in den Global Constraints.

## Global Constraints

- Zur Laufzeit keine Anfragen an Dritte, keine externen Schriften, keine Analyse-Dienste. Alle Bibliotheken werden mitgeliefert (Spec 5, 12).
- Alle Daten bleiben im Browser. Sie verlassen das Gerät nur, wenn der Anwender es ausdrücklich auslöst (Fotos an den Chatbot, QR-Codes, Datei, Text), und die App sagt jeweils, wohin sie gehen (Spec 12).
- Das Geburtsdatum in der PC-App ist nur zur Prüfung da und wird nicht übertragen. Das Profil entsteht auf dem Handy (Spec 8.1).
- Gescannt wird in der Handy-App selbst, nicht mit der Kamera-App des iPhones (Spec 8.2).
- PC-App unter `/import/` mit eigenem Manifest (`id` und `scope` `/import/`), getrennt installierbar (Spec 5). Dieselbe strikte CSP wie die Handy-App (`vite/csp.ts`).
- Oberfläche nur Deutsch. Alle Texte beider Apps stehen in `src/texts.ts`, auch die Anleitung für den Chatbot.
- Der Kern (`src/core/`) importiert nichts aus `src/app/`, `src/import/`, `src/components/`, `react` oder `react-dom`. Die PC-App importiert nichts aus `src/app/`, die Handy-App nichts aus `src/import/`. Gemeinsames liegt in `src/core/`, `src/components/` oder `src/lib/`.
- Katalog-IDs werden nie umbenannt (`CLAUDE.md`). Sie stehen jetzt auch in Übertragungen.
- Kalenderdaten sind Strings `YYYY-MM-DD`, gespeichert wird bei unsicheren Daten der früheste Tag (Spec 7.3). Gerechnet wird nur mit den Hilfen aus `src/core/dates.ts`.
- Eingabefelder für Arzt oder Praxis und für die Charge setzen `autoCorrect="off"` und `spellCheck={false}` (Wunsch des Nutzers, 27.11.2026).
- Gut lesbar auch für Ältere: Grundschrift 18 px, Bedienflächen mindestens 44 × 44 px, helles und dunkles Design nach Systemeinstellung (Spec 14). QR-Codes sind immer dunkel auf weißem Grund.
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`); Bestätigungen über shadcn `AlertDialog`.
- Bezeichner im Code englisch, Texte der Oberfläche deutsch.
- CI mit Node 22. Die Tests laufen vor jedem Deploy (Spec 13).
- Commit-Nachrichten im Stil `feat: …`/`fix: …`/`chore: …`/`refactor: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Die Chatbot-Antwort ist kein sauberes JSON: Text davor und danach, ein Codeblock, zwei Codeblöcke, von denen nur einer passt. Die PC-App liest die Impfungen trotzdem, oder sie sagt verständlich, was fehlt, und das Eingefügte bleibt stehen. Tests in Task 2 und Task 8.
2. QR-Teile kommen durcheinander: in beliebiger Reihenfolge, derselbe Teil zweimal, ein Teil einer anderen Übertragung, ein beschädigter Teil. Die Handy-App zeigt den Fortschritt, sagt, was los ist, und übernimmt nie eine halbe Übertragung. Tests in Task 3 und Task 12.
3. Die Handy-App ist älter als die PC-App (unbekannter Impfstoff, unbekannte Krankheit, Format-Version 2). Die Handy-App übernimmt nichts und sagt, wie sie zur neuen Version kommt. Tests in Task 3 und Task 12.
4. Einträge sind schon da: dieselbe Übertragung zweimal gescannt, oder eine Impfung vorher von Hand mit genauem Tag eingetragen und im Import nur mit Monat. Die Vorschau zeigt „Schon eingetragen“, und diese Einträge sind abgewählt. Tests in Task 11 und Task 12.
5. Die Kamera geht nicht: Zugriff auf dem iPhone verweigert, PC oder Handy ohne Kamera. Die Handy-App erklärt das und bietet Datei und Text an. Test in Task 13.

---

### Task 1: Passdaten und Krankheitsnamen

**Files:**
- Create: `src/core/import/passDate.ts`, Test `src/core/import/passDate.test.ts`
- Modify: `src/core/catalog/recognize.ts`, Test `src/core/catalog/recognize.test.ts`

**Interfaces:**
- Produces: `parsePassDate(raw: string, today: ISODate): { date: ISODate; precision: DatePrecision } | "empty" | "invalid"` und `recognizeDisease(label: string): DiseaseId | null`.

- [ ] **Step 1: Tests schreiben** (`today = "2026-11-27"`):
  - `"05.12.2016"`, `" 5.12.2016 "`, `"05. 12. 2016"`, `"2016-12-05"` → `{ date: "2016-12-05", precision: "day" }`
  - `"12.2016"`, `"12/2016"`, `"2016-12"` → `{ date: "2016-12-01", precision: "month" }`
  - `"2016"` → `{ date: "2016-01-01", precision: "year" }`
  - Unleserliche Stellen: `"??.12.2016"` und `"x.12.2016"` → Monat, `"??.??.2016"` → Jahr
  - Zweistellige Jahre: `"12.03.75"` → `1975-03-12`, `"05.12.16"` → `2016-12-05`, `"01.01.26"` → `2026-01-01`, `"01.01.27"` → `1927-01-01` (größer als das laufende Jahr zweistellig heißt 19xx)
  - `"31.02.2016"`, `"13.2016"`, `"Dezember 2016"` → `"invalid"`; `""` und `"  "` → `"empty"`
  - `recognizeDisease`: `"Tetanus"` → `tetanus`, `"wundstarrkrampf"` → `tetanus`, `"tetanus"` (ID) → `tetanus`, `"Polio"` → `polio`, `"Grippe"` → `influenza`, `"FSME"` → `tbe`, `"Gürtelrose"` → `zoster`, `"Tine-Test"` → `null`
- [ ] **Step 2:** `npx vitest run src/core/import src/core/catalog` → rot, weil die Funktionen fehlen.
- [ ] **Step 3:** Implementieren. `parsePassDate` prüft das Ergebnis mit `isValidISODate`. `recognizeDisease` vergleicht `normalizeLabel` mit ID, Name und Aliasen aus `DISEASES`, nur exakt, ohne Unschärfe.
- [ ] **Step 4:** Tests grün, `npm run lint`, `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(core): parse pass dates and disease names`.

### Task 2: Chatbot-Antwort lesen und Anleitung

**Files:**
- Create: `src/core/import/chatbot.ts`, Test `src/core/import/chatbot.test.ts`, Testdatei `src/test/fixtures/chatbot-answer.txt`
- Modify: `src/texts.ts` (`T.pc.prompt`, `T.pc.chatbotErrors`, `T.pc.hints`)

**Interfaces:**
- Consumes: `recognizeDisease` (Task 1). Das Datum bleibt Text, geprüft wird es erst im Entwurf.
- Produces:
  - `type RowField = "date" | "label" | "batch" | "doctor" | "diseases"`
  - `interface ParsedRow { date: string; label: string; batch: string; doctor: string; diseases: DiseaseId[]; unsure: RowField[]; hints: string[] }`
  - `parseChatbotAnswer(text: string): ParsedRow[]`, wirft `ChatbotAnswerError` mit `code: "noJson" | "noEntries" | "tooLong"` und der Meldung aus `T.pc.chatbotErrors`.

Die Anleitung steht wörtlich in `T.pc.prompt`:

```text
Auf den Fotos sind Seiten aus einem deutschen Impfpass. Lies alle Impfungen ab und gib sie als JSON in genau diesem Format zurück, in einem einzigen Codeblock:

{"impfpass":"import","vaccinations":[{"date":"05.12.2016","name":"Boostrix Polio","batch":"AC52B123AB","doctor":"Praxis Dr. Muster, Hamburg","diseases":[],"unsure":[]}]}

So füllst du die Felder:
- Ein Eintrag je Impfung. Klebt derselbe Impfstoff mit demselben Datum in mehreren Abschnitten des Passes, trag ihn nur einmal ein.
- date: das Datum wie im Pass als TT.MM.JJJJ. Ist nur Monat und Jahr lesbar, schreib MM.JJJJ, ist nur das Jahr lesbar, JJJJ.
- name: der Handelsname des Impfstoffs, so wie er auf dem Aufkleber oder im Stempel steht.
- batch: die Chargennummer, sonst "".
- doctor: Arzt, Praxis oder Ort aus dem Stempel, sonst "".
- diseases: nur wenn kein Handelsname lesbar ist, die Krankheiten auf Deutsch, etwa ["Tetanus","Diphtherie"]. Sonst [].
- unsure: die Felder, die du nicht sicher lesen konntest, etwa ["date","batch"]. Rate nicht. Schreib, was du lesen kannst, und nenn das Feld hier.
- Lass alles weg, was keine Impfung ist, etwa Tuberkulintests, Blutgruppe oder Antikörperbefunde.
```

`T.pc.chatbotErrors`: `noJson` „In der Antwort steht keine Liste von Impfungen. Kopiere die ganze Antwort des Chatbots, auch den Codeblock.“, `noEntries` „Die Antwort enthält keine Impfungen.“, `tooLong` „Die Antwort ist zu lang. Füge höchstens 1 MB Text ein.“ `T.pc.hints.diseaseUnknown(name)` „Krankheit „{name}“ nicht erkannt.“

- [ ] **Step 1: Tests schreiben:**
  - Sauberes JSON nach dem Muster ergibt eine Zeile mit allen Feldern; `"name"` landet in `label`.
  - Dieselbe Antwort im Codeblock ```` ```json ```` mit Text davor und danach ergibt dasselbe.
  - Zwei Codeblöcke, der erste ohne `vaccinations`: gelesen wird der zweite.
  - Ein reines Array von Einträgen wird angenommen, ebenso ein Objekt ohne `"impfpass":"import"`.
  - `"unsure":["name","date","foo"]` → `unsure: ["label","date"]`.
  - `"diseases":["Tetanus","Wundstarrkrampf","Tine-Test"]` → `diseases: ["tetanus"]` (doppelte entfernt), `unsure` enthält `"diseases"`, `hints` enthält „Krankheit „Tine-Test“ nicht erkannt.“
  - Zahlen statt Text (`"date": 2016`) werden zu Text; leere Einträge entfallen.
  - Text ohne JSON → `noJson`; `{"vaccinations":[]}` → `noEntries`; mehr als 1 000 000 Zeichen → `tooLong`.
  - Das JSON-Beispiel aus `T.pc.prompt` ergibt mit `parseChatbotAnswer` genau eine Zeile (Anleitung und Parser passen zusammen).
  - `src/test/fixtures/chatbot-answer.txt` (eine erfundene Antwort mit zwölf Impfungen, Text um den Codeblock, einer unscharfen Schreibweise „Bostrix Polio“, einem Eintrag nur mit Krankheiten und einem mit `"unsure":["date"]`) ergibt zwölf Zeilen. Dieselbe Datei wird beim Test von Hand in Task 14 gebraucht.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. Zuerst den ganzen Text mit `JSON.parse` versuchen, dann jeden Abschnitt von `{` oder `[` bis zur passenden schließenden Klammer (Klammern in Strings zählen nicht), in Reihenfolge, bis einer Impfungen enthält. Kein `eval`, keine Bibliothek.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(core): read chatbot answers, add chatbot instructions`.

### Task 3: Übertragungsformat

**Files:**
- Create: `src/core/formats/base45.ts`, `src/core/formats/crc32.ts`, `src/core/formats/transfer.ts`, je mit Test; Testhilfe `src/test/transfer.ts`
- Modify: `src/core/model.ts`, `src/core/catalog/diseases.ts`, `src/app/format.ts`, `src/texts.ts` (`T.transfer.errors`), `package.json` (`fflate`)

**Interfaces:**
- Produces:
  - In `model.ts`: `interface TransferEntry { date: ISODate; datePrecision: DatePrecision; productId: string | null; label: string; diseases: DiseaseId[]; batch?: string; doctor?: string; note?: string }` und `interface TransferPayload { id: string; createdAt: string; entries: TransferEntry[] }`. `label` ist nie leer, `diseases` immer gefüllt.
  - `encodeBase45(bytes: Uint8Array): string`, `decodeBase45(s: string): Uint8Array` (wirft bei fremden Zeichen)
  - `crc32(bytes: Uint8Array): number`
  - `QR_PART_CHARS = 700`, `MAX_TRANSFER_BYTES = 1_000_000`
  - `newTransferId(): string` (6 Zeichen `0-9A-Z` aus `crypto.getRandomValues`)
  - `encodeTransfer(p: TransferPayload, maxChars: number = QR_PART_CHARS): string[]`
  - `interface TransferCollector { id: string; total: number; crc: string; chunks: (string | undefined)[] }`
  - `addPart(c: TransferCollector | null, line: string): { collector: TransferCollector; added: boolean }`
  - `missingParts(c: TransferCollector): number[]` (1-basiert)
  - `decodeCollected(c: TransferCollector): TransferPayload`
  - `readTransferText(text: string): { payload: TransferPayload } | { collector: TransferCollector; missing: number[] }`
  - `transferFileName(now: Date): string` → `impfpass-uebertragung-2026-11-27.txt`
  - `class TransferError extends Error` mit `code: "notTransfer" | "otherTransfer" | "tooNew" | "corrupt"` und der Meldung aus `T.transfer.errors`.
  - `diseaseLabel(ids: readonly DiseaseId[]): string` in `src/core/catalog/diseases.ts`, die bisherige `diseaseNames` aus `src/app/format.ts` (Namen in der Reihenfolge von `DISEASE_IDS`, mit Komma getrennt). Die Handy-App nutzt sie künftig von dort.
  - Testhilfen in `src/test/transfer.ts`: `typicalEntries(n: number): TransferEntry[]` mit festen, wiederholbaren Einträgen (übliche Impfstoffe, Chargen wie `AB123456`, fünf verschiedene Praxen, Daten über 50 Jahre verteilt, ein Teil nur mit Monat oder Jahr, einer ohne Impfstoff) und `packParts(wire: unknown, options?: { version?: number; id?: string }): string[]`, die beliebiges JSON zu Teilzeilen packt, für Tests mit fremden oder kaputten Inhalten.

Inhalt vor dem Packen, als JSON: `{"i":<id>,"c":<createdAt>,"e":[[datum, productId|0, label|0, diseases|0, batch|0, doctor|0, note|0], …]}`. Das Datum trägt die Genauigkeit über seine Länge (`2016`, `2016-12`, `2016-12-05`). `0` steht je Feld für die Voreinstellung: bei `productId` kein Impfstoff, bei `label` der Name des Impfstoffs oder ohne Impfstoff `diseaseLabel` der Krankheiten, bei `diseases` die Krankheiten des Impfstoffs (nur mit Impfstoff), bei `batch`, `doctor` und `note` leer. Nullen am Ende entfallen. Teilzeile: `IP:<version>:<n>/<gesamt>:<id>:<base45>:<CRC-32 als 8 Hex-Ziffern>`.

`T.transfer.errors`: `notTransfer` „Das ist kein Code von ImpfPass.“, `otherTransfer` „Dieser Code gehört zu einer anderen Übertragung.“, `tooNew` „Die Übertragung stammt aus einer neueren Version von ImpfPass. Schließe ImpfPass ganz und öffne es wieder, dann lädt die neue Version.“, `corrupt` „Die Übertragung ist beschädigt. Erzeuge sie am PC neu.“

- [ ] **Step 1: `npm install fflate@0.8.3`**, dann Tests schreiben:
  - Base45 nach RFC 9285: `"AB"` → `"BB8"`, `"Hello!!"` → `"%69 VD92EX0"`, `"base-45"` → `"UJCLQE7W581"`, `"QED8WEX0"` → `"ietf!"`; Kleinbuchstaben werfen; Hin und zurück für Längen 0 bis 10.
  - `crc32` von `"123456789"` ist `0xCBF43926`.
  - Hin und zurück mit drei Einträgen (mit und ohne Impfstoff, Tag, Monat, Jahr, mit und ohne Charge): `readTransferText(encodeTransfer(p).join("\n"))` ergibt `p`.
  - Jede Teilzeile passt auf `/^IP:1:\d+\/\d+:[0-9A-Z]{6}:[0-9A-Z $%*+\-.\/:]+:[0-9A-F]{8}$/`.
  - `typicalEntries(50)` ergibt höchstens 3 Teile, keiner länger als `QR_PART_CHARS + 30` Zeichen (Spec 8.2: 25 bis 50 Einträge, ein bis drei Codes).
  - Teile in umgekehrter Reihenfolge ergeben das Ganze; derselbe Teil zweimal ergibt `added: false`; Teil einer anderen ID → `otherTransfer`; `"HC1:…"` → `notTransfer`; Version `2` → `tooNew`; ein geändertes Zeichen in den Daten → `corrupt` beim Zusammensetzen; fehlender Teil → `missingParts` ergibt `[2]`.
  - Unbekannte `productId` oder Krankheits-ID in den Daten → `tooNew` (mit `packParts`).
  - Daten, die entpackt größer als `MAX_TRANSFER_BYTES` sind → `corrupt`.
  - `readTransferText` verträgt Leerzeilen, Leerzeichen am Zeilenanfang und Windows-Zeilenenden.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. `deflateSync` mit Stufe 9 und `inflateSync` aus `fflate`; beim Entpacken die Größe begrenzen (etwa mit der Klasse `Inflate` und abbrechen, sobald `MAX_TRANSFER_BYTES` überschritten ist). Das entpackte JSON mit zod prüfen (höchstens 2000 Einträge, Texte höchstens 500 Zeichen). Die Prüfsumme gilt über die gepackten Bytes.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(core): transfer format with deflate, Base45 and checksum`.

### Task 4: Entwurf, Prüfungen und Dubletten

**Files:**
- Create: `src/core/import/draft.ts`, `src/core/import/duplicates.ts`, je mit Test
- Modify: `src/core/formats/schemas.ts` (`draftSchema`), `src/texts.ts` (`T.pc.issues`)

**Interfaces:**
- Consumes: `ParsedRow`, `RowField` (Task 2), `parsePassDate` (Task 1), `TransferEntry` (Task 3), `recognizeProduct` und `getProduct` aus dem Katalog.
- Produces:
  - `interface DraftRow { id: string; date: string; label: string; productId: string | null; diseases: DiseaseId[]; batch: string; doctor: string; note: string; unsure: RowField[]; hints: string[]; reviewed: boolean }` (`date` so wie eingegeben, etwa `05.12.2016`)
  - `interface Draft { version: 1; birthDate: string; rows: DraftRow[]; updatedAt: string }`
  - `type RowIssue` mit `blocking: true` für `dateMissing`, `dateInvalid`, `dateFuture`, `dateBeforeBirth`, `noDisease` und `blocking: false` für `productFuzzy { read; productId }`, `productAmbiguous { candidates: string[] }`, `productUnknown`, `unsure { fields: RowField[] }`, `hint { text }`, `duplicate { otherRow: number }` (1-basiert)
  - `emptyDraft(now: Date): Draft`, `newRow(id: string): DraftRow`, `rowFromParsed(p: ParsedRow, id: string): DraftRow`
  - `withLabel(row: DraftRow, label: string): DraftRow` (exakt oder unscharf erkannt: `productId` und Krankheiten vom Impfstoff; mehrdeutig oder nicht erkannt: `productId: null`, Krankheiten bleiben)
  - `withProduct(row: DraftRow, productId: string): DraftRow` (Label wird der Name des Impfstoffs), `withDiseases(row: DraftRow, diseases: DiseaseId[]): DraftRow` (nur ohne Impfstoff)
  - `checkBirthDate(raw: string, today: ISODate): "ok" | "empty" | "invalid" | "future"` (nur mit Tag gilt es)
  - `checkDraft(draft: Draft, today: ISODate): Map<string, RowIssue[]>` (bei `reviewed` ohne Hinweise, Fehler bleiben)
  - `draftToEntries(draft: Draft, today: ISODate): TransferEntry[]` (wirft, solange eine Zeile einen Fehler hat; leeres Label wird zu `diseaseLabel` der Krankheiten, etwa „Tetanus, Diphtherie“; leere Texte entfallen)
  - `isPossibleDuplicate(a: Dated, b: Dated): boolean` mit `Dated = { date: ISODate; datePrecision: DatePrecision; diseases: DiseaseId[] }`

`T.pc.issues`: `dateMissing` „Datum fehlt.“, `dateInvalid` „Datum nicht lesbar. Schreib TT.MM.JJJJ, MM.JJJJ oder JJJJ.“, `dateFuture` „Das Datum liegt in der Zukunft.“, `dateBeforeBirth` „Das Datum liegt vor dem Geburtsdatum.“, `noDisease` „Impfstoff nicht erkannt. Wähle die Krankheiten.“, `productFuzzy(read, name)` „Gelesen „{read}“, erkannt als {name}.“, `productAmbiguous` „Mehrere Impfstoffe passen:“, `productUnknown` „Impfstoff nicht in der Liste. Die Krankheiten sind von Hand gewählt.“, `unsure(fields)` „Unsicher gelesen: {Felder}.“ mit den Spaltennamen, `duplicate(n)` „Vielleicht doppelt, siehe Zeile {n}.“

- [ ] **Step 1: Tests schreiben** (`today = "2026-11-27"`, Geburtsdatum `15.03.1967`):
  - `withLabel("Boostrix Polio")` setzt Impfstoff und vier Krankheiten; `"Bostrix Polio"` setzt denselben Impfstoff und ergibt `productFuzzy`; ein mehrdeutiger Name ergibt `productAmbiguous` mit den Kandidaten; ein unbekannter Name ohne Krankheiten ergibt `noDisease`, mit Krankheiten `productUnknown`.
  - Datum: leer → `dateMissing`, `31.02.2016` → `dateInvalid`, `12.2026` ist kein Fehler, `01.2027` → `dateFuture`, `1967` ist kein Fehler, `02.1967` → `dateBeforeBirth`; ohne Geburtsdatum keine Prüfung darauf.
  - Vom Chatbot unsicher gelesene Felder ergeben `unsure`, `hints` ergeben `hint`; mit `reviewed: true` verschwinden die Hinweise, `dateMissing` bleibt.
  - Zeilen 2 und 5 mit gleichem Datum und überlappender Krankheit tragen `duplicate` mit der jeweils anderen Zeilennummer.
  - `draftToEntries`: `05.12.2016` → `2016-12-05`/`day`, leere Charge entfällt, Zeile ohne Label mit Tetanus und Diphtherie → Label „Tetanus, Diphtherie“; mit einem Fehler wirft die Funktion.
  - `isPossibleDuplicate`: gleicher Tag mit Überlappung → `true`, ohne Überlappung → `false`, `2016-12` (Monat) und `2016-12-05` (Tag) → `true`, `2016` (Jahr) und `2016-07-01` (Tag) → `true`, `2016` und `2017-01-01` → `false`.
  - `draftSchema` nimmt einen Entwurf an und lehnt einen ohne `rows` ab.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(core): import draft with checks and duplicate rule`.

### Task 5: QR-Codes erzeugen und lesen

**Files:**
- Create: `src/core/formats/qr.ts` mit Test, `src/components/QrCode.tsx` mit Test, Testhilfe `src/test/qr.ts`
- Modify: `package.json` (`qrcode`, `jsqr`, `@types/qrcode`)

**Interfaces:**
- Consumes: `encodeTransfer`, `typicalEntries` (Task 3).
- Produces:
  - `qrMatrix(text: string): boolean[][]` (über `QRCode.create(text, { errorCorrectionLevel: "M" })`, `true` = dunkles Modul)
  - `<QrCode text: string; label: string; className?: string />`: ein `<svg role="img" aria-label={label}>` mit weißem Hintergrund, Ruhezone von 4 Modulen, einem `<path>` für alle dunklen Module und `shape-rendering="crispEdges"`, ohne `dangerouslySetInnerHTML`
  - Testhilfe `matrixToImage(m: boolean[][], scale: number): { data: Uint8ClampedArray; width: number; height: number }` (RGBA, mit Ruhezone)

- [ ] **Step 1: `npm install qrcode@1.5.4 jsqr@1.4.0` und `npm install -D @types/qrcode@1.5.6`**, dann Tests schreiben:
  - `qrMatrix` liefert eine quadratische Matrix mit `17 + 4 · Version` Zeilen.
  - Jeder Teil von `encodeTransfer({ …, entries: typicalEntries(50) })` lässt sich zeichnen (`matrixToImage(m, 4)`) und mit `jsQR` zurücklesen, der gelesene Text ist gleich dem Teil.
  - Bei `QR_PART_CHARS` Datenzeichen ist die Version höchstens 17 (85 × 85 Module). Reicht das nicht, sinkt `QR_PART_CHARS` in Schritten von 50, bis es passt; der Test aus Task 3 (höchstens 3 Teile bei 50 Einträgen) muss dabei grün bleiben.
  - `QrCode` rendert ein `svg` mit dem `aria-label`, einem weißen `rect` und einem nicht leeren `path`.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck, `npm run build` (das Bündel enthält kein `pngjs` und kein `yargs`; `qrcode` bringt im Browser seine Datei `lib/browser.js` mit).
- [ ] **Step 5:** Commit `feat: draw and read QR codes`.

### Task 6: Zweite Seite unter /import/

**Files:**
- Create: `import/index.html`, `src/import/main.tsx`, `src/import/ImportApp.tsx` mit Test, `public/import/manifest.webmanifest`, gegebenenfalls `vite/importPage.ts` mit Test
- Modify: `vite.config.ts`, `vite/pwa.ts` (Kommentar zum Bündel), `src/core/boundaries.test.ts`, `src/texts.ts` (`T.pc.title`), `CLAUDE.md` (Ordner)

**Interfaces:**
- Produces: `ImportApp()` als Wurzel der PC-App; vorerst nur die Überschrift „ImpfPass am PC“. Task 7 baut sie aus.

`import/index.html` wie `index.html`, aber mit Titel „ImpfPass am PC“, `<link rel="manifest" href="/import/manifest.webmanifest">` und `src="/src/import/main.tsx"`. Manifest:

```json
{
  "id": "/import/",
  "name": "ImpfPass am PC",
  "short_name": "ImpfPass PC",
  "description": "Alte Impfungen aus dem Papier-Impfpass übernehmen",
  "lang": "de",
  "start_url": "/import/",
  "scope": "/import/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/maskable-icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 1: Tests schreiben:** `ImportApp` zeigt die Überschrift „ImpfPass am PC“. `boundaries.test.ts` prüft außerdem, dass der Kern nichts aus `src/import/` importiert, `src/import/` nichts aus `src/app/` und `src/app/` nichts aus `src/import/`.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren. Beide Seiten als Einstiege des Builds eintragen (in Vite 8 unter dem Schlüssel, den die installierte Version dokumentiert, `build.rolldownOptions.input` oder `build.rollupOptions.input`). Setzt `vite-plugin-pwa` in `dist/import/index.html` auch den Link auf `/manifest.webmanifest`, entfernt ihn ein kleines Plugin `vite/importPage.ts` (Test mit einem HTML-Beispiel). Der Kommentar in `vite/pwa.ts` sagt künftig: Beide Seiten laden ihre Teile beim Start, nichts wird nachgeladen.
- [ ] **Step 4:** Tests grün, Lint, Typecheck, `npm run build`. Dann prüfen: `dist/import/index.html` enthält die CSP, genau einen Manifest-Link auf `/import/manifest.webmanifest`, die Startmeldung aus `bootFallback` und das Skript; `dist/import/manifest.webmanifest` ist da. In `npm run dev` öffnet `http://localhost:5173/import/` die PC-App.
- [ ] **Step 5:** Commit `feat: second page for the PC import under /import/`.

### Task 7: Entwurf speichern und Rahmen der PC-App

**Files:**
- Create: `src/core/storage/draftStore.ts` mit Test, `src/import/useDraft.ts` mit Test
- Modify: `src/import/ImportApp.tsx` mit Test, `src/texts.ts` (`T.pc`)

**Interfaces:**
- Consumes: `Draft`, `emptyDraft`, `draftSchema` (Task 4), `StorageUnavailableError` aus `repository.ts`.
- Produces:
  - `openDraftStore(): Promise<DraftStore>` mit `DraftStore { load(): Promise<Draft | null>; save(d: Draft): Promise<void>; clear(): Promise<void> }`. Datenbank `impfpass-import`, Version 1, Store `draft`, Schlüssel `current`. Ein Eintrag, der `draftSchema` nicht besteht, ergibt `null`. Kein IndexedDB → `StorageUnavailableError`.
  - `useDraft(open: () => Promise<DraftStore> = openDraftStore): { status: "loading" | "ready"; draft: Draft; persistent: boolean; update(fn: (d: Draft) => Draft): void; clear(): Promise<void> }`. Gespeichert wird 500 ms nach der letzten Änderung und sofort bei `visibilitychange` auf `hidden` und bei `pagehide`.
  - `ImportApp` zeigt Kopf, Schrittleiste „1 Anleitung“, „2 Tabelle prüfen“, „3 Übertragen“ und den Fuß mit „ImpfPass ersetzt keine ärztliche Beratung.“ und „Der Entwurf bleibt in diesem Browser auf diesem PC.“ Mit Zeilen im Entwurf beginnt sie bei Schritt 2, sonst bei Schritt 1. Schritt 1 und 2 lassen sich in der Schrittleiste anklicken, Schritt 3 erreicht man nur über „Weiter zum Übertragen“ (Task 9). Die Schritte selbst kommen in Task 8 bis 10; bis dahin zeigt jeder Schritt seine Überschrift.

`T.pc.notSaved`: „Dieser Browser erlaubt kein Speichern. Der Entwurf geht verloren, wenn du die Seite schließt.“

- [ ] **Step 1: Tests schreiben:** gespeicherter Entwurf wird beim Start geladen und startet bei Schritt 2; eine Änderung landet nach kurzer Zeit im Speicher; ein ungültiger gespeicherter Eintrag ergibt einen leeren Entwurf; scheitert `open`, erscheint `T.pc.notSaved` und Änderungen wirken trotzdem; `clear` leert den Speicher.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren, mit `idb` wie `src/core/storage/db.ts`.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(pc): keep the import draft in the browser`.

### Task 8: Schritt 1, Anleitung und Antwort einfügen

**Files:**
- Create: `src/import/GuideStep.tsx` mit Test
- Modify: `src/import/ImportApp.tsx`, `src/texts.ts`

**Interfaces:**
- Consumes: `T.pc.prompt`, `parseChatbotAnswer` (Task 2), `rowFromParsed`, `newRow` (Task 4), `useDraft` (Task 7).
- Produces: `GuideStep({ draft, update, onDone }: { draft: Draft; update(fn: (d: Draft) => Draft): void; onDone(message: string): void })`.

Inhalt von oben nach unten:
- Überschrift „Alte Impfungen übernehmen“ und drei Schritte: „1. Fotografiere die Seiten deines Impfpasses und bring die Fotos auf diesen PC.“ „2. Kopiere die Anleitung unten und gib sie zusammen mit den Fotos einem Chatbot, etwa Claude oder ChatGPT.“ „3. Füge die Antwort des Chatbots unten ein und prüfe die Tabelle.“
- Hinweis (`role="note"`), wörtlich: „Die Fotos zeigen Gesundheitsdaten. Lädst du sie bei einem Chatbot hoch, landen sie beim Anbieter des Chatbots, nicht bei ImpfPass. Schalte dort die Verwendung deiner Daten für das Training ab, wo das geht.“
- Die Anleitung in einem schreibgeschützten Textfeld und der Knopf „Anleitung kopieren“. Klappt `navigator.clipboard.writeText`, steht dort „Kopiert.“; sonst wird der Text markiert, und es erscheint „Kopieren hat nicht geklappt. Der Text ist markiert, kopiere ihn mit Strg+C.“
- „Geburtsdatum (freiwillig)“ mit dem Hinweis „Nur zur Prüfung der Daten. Es bleibt auf diesem PC und wird nicht übertragen.“ Speichert in `draft.birthDate`.
- Textfeld „Antwort des Chatbots“ und Knopf „Einlesen“. Erfolg hängt die Zeilen an den Entwurf an und ruft `onDone("{n} Impfungen eingelesen. Prüfe sie in der Tabelle.")`. Fehler erscheinen mit `role="alert"`, das Eingefügte bleibt stehen.
- Knopf „Ohne Chatbot weiter“: legt eine leere Zeile an, wenn der Entwurf keine hat, und geht zu Schritt 2.

- [ ] **Step 1: Tests schreiben:** „Anleitung kopieren“ übergibt `T.pc.prompt` an die Zwischenablage; abgelehnte Zwischenablage zeigt den Ersatztext; Einlesen von `chatbot-answer.txt` legt zwölf Zeilen an und wechselt zu Schritt 2 mit der Meldung; unlesbare Antwort zeigt die Fehlermeldung, das Textfeld behält den Text; das Geburtsdatum landet im Entwurf; der Hinweis zu den Gesundheitsdaten ist sichtbar.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(pc): instructions and chatbot answer`.

### Task 9: Schritt 2, Tabelle prüfen

**Files:**
- Create: `src/import/DraftTable.tsx` mit Test, `src/import/DiseasePicker.tsx` mit Test, `src/components/ui/dialog.tsx` (`npx shadcn add dialog`)
- Modify: `src/import/ImportApp.tsx`, `src/texts.ts`

**Interfaces:**
- Consumes: `checkDraft`, `checkBirthDate`, `withLabel`, `withProduct`, `withDiseases`, `newRow`, `T.pc.issues` (Task 4), `PRODUCTS`, `DISEASE_IDS`, `DISEASES`.
- Produces: `DraftTable({ draft, update, onNext }: { draft: Draft; update(fn: (d: Draft) => Draft): void; onNext(): void })`, `DiseasePicker({ value, onChange, rowNumber }: { value: DiseaseId[]; onChange(d: DiseaseId[]): void; rowNumber: number })`.

Verhalten:
- Spalten: Nr., Datum, Impfstoff, Krankheiten, Charge, Arzt oder Praxis, Notiz, Hinweise, Löschen. Jedes Feld hat ein `aria-label` mit Zeilennummer, etwa „Datum, Zeile 3“. Die Tabelle nutzt die Breite des Bildschirms und scrollt bei schmalen Fenstern waagerecht.
- Impfstoff: Textfeld mit `<datalist>` aller Impfstoffnamen, Änderungen über `withLabel`. Bei `productAmbiguous` stehen die Kandidaten als Knöpfe in den Hinweisen, ein Klick ruft `withProduct`.
- Krankheiten: mit Impfstoff nur als Text; ohne Impfstoff ein Knopf „Krankheiten wählen“ (mit Anzahl), der `DiseasePicker` als Dialog mit Kästchen öffnet.
- Charge und Arzt oder Praxis mit `autoCorrect="off"`, `spellCheck={false}` und `autoComplete="off"`.
- Fehler stehen rot, Hinweise mit Symbol und Text; ein Kästchen „Hinweise geprüft“ setzt `reviewed`.
- „Zeile hinzufügen“ hängt eine leere Zeile an. Löschen entfernt die Zeile sofort und zeigt „Zeile {n} gelöscht.“ mit „Rückgängig“, das sie an derselben Stelle zurückholt, bis zur nächsten Löschung.
- Über der Tabelle: „{n} Impfungen, {f} mit Fehlern, {h} mit Hinweisen.“ und Meldungen zum Geburtsdatum (`invalid`, `future`).
- „Weiter zum Übertragen“: gesperrt ohne Zeilen oder mit Fehlern, dann mit „Behebe zuerst die rot markierten Zeilen.“; mit offenen Hinweisen ein `AlertDialog` „{h} Zeilen haben noch Hinweise. Trotzdem übertragen?“ mit „Zurück zur Tabelle“ und „Übertragen“.

- [ ] **Step 1: Tests schreiben:** ein korrigiertes Datum lässt den Fehler verschwinden; „Boostrix Polio“ zeigt die Krankheiten als Text; „Bostrix Polio“ zeigt den Hinweis zur unscharfen Erkennung; ein mehrdeutiger Name zeigt Kandidaten, ein Klick wählt einen; ohne Impfstoff zwei Krankheiten im Dialog wählen beseitigt `noDisease`; Löschen und „Rückgängig“; „Zeile hinzufügen“; „Hinweise geprüft“ blendet die Hinweise der Zeile aus; „Weiter zum Übertragen“ ist mit Fehlern gesperrt und fragt bei Hinweisen nach; das Feld „Arzt oder Praxis, Zeile 1“ hat `autocorrect="off"` und `spellcheck="false"`.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(pc): editable table with checks`.

### Task 10: Schritt 3, Übertragen

**Files:**
- Create: `src/import/TransferStep.tsx` mit Test, `src/lib/saveFile.ts` mit Test
- Modify: `src/app/backup/saveBackup.ts` (nutzt `saveFile`), `src/import/ImportApp.tsx`, `src/texts.ts`

**Interfaces:**
- Consumes: `draftToEntries` (Task 4), `newTransferId`, `encodeTransfer`, `transferFileName` (Task 3), `QrCode` (Task 5), `useDraft().clear` (Task 7).
- Produces:
  - `saveFile(file: File, options?: { preferShare?: boolean }): Promise<"shared" | "downloaded" | "cancelled">`. Das ist die Logik aus `saveBackupFile`; `preferShare` (Standard `true`) entscheidet, ob zuerst das Teilen-Menü versucht wird. Die PC-App übergibt `false`, sonst öffnet Windows sein Teilen-Fenster.
  - `TransferStep({ draft, onBack, onCleared }: { draft: Draft; onBack(): void; onCleared(): void })`

Verhalten: Beim Öffnen entsteht aus dem Entwurf eine Übertragung mit neuer ID. Drei Abschnitte:
- QR-Codes: „Code {n} von {gesamt}“, der Code groß (Breite `min(80vh, 640px)`), „Vorheriger Code“ und „Nächster Code“, dazu die Pfeiltasten. Darunter: „Öffne ImpfPass auf dem Handy, tippe in den Einstellungen auf „Impfungen übernehmen“ und scanne die Codes. Die Reihenfolge ist egal.“ und „Die Codes enthalten deine Impfdaten. Sie gehen vom Bildschirm direkt in die Kamera deines Handys, nicht ins Internet.“
- Datei: „Datei speichern“ speichert die Übertragung als eine Zeile in `impfpass-uebertragung-JJJJ-MM-TT.txt`. Text: „Schick die Datei aufs Handy und öffne sie in ImpfPass unter „Impfungen übernehmen“ mit „Datei öffnen“. Per E-Mail oder über eine Cloud gehen die Daten dabei über deren Anbieter.“
- Text: „Text kopieren“ kopiert dieselbe Zeile, mit demselben Ersatz wie in Task 8.
- „Zurück zur Tabelle“. „Entwurf löschen“ fragt mit `AlertDialog` „Entwurf löschen? Die Tabelle mit allen Einträgen wird auf diesem PC gelöscht.“ und ruft danach `onCleared`; die App zeigt Schritt 1 mit „Der Entwurf ist gelöscht.“

- [ ] **Step 1: Tests schreiben:** zeigt „Code 1 von N“ und blättert weiter; die gespeicherte Datei hat den Namen aus `transferFileName` und ergibt mit `readTransferText` die Einträge aus `draftToEntries`; „Text kopieren“ übergibt dieselbe Zeile; „Entwurf löschen“ leert nach Bestätigung den Speicher; `saveFile` mit `preferShare: false` ruft `navigator.share` nicht auf. Die bisherigen Tests der Sicherung bleiben grün.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat(pc): transfer as QR codes, file or text`.

### Task 11: Zusammenführen auf dem Handy

**Files:**
- Create: `src/core/import/merge.ts` mit Test
- Modify: `src/core/storage/repository.ts` mit Test, `src/app/data/AppData.tsx` mit Test

**Interfaces:**
- Consumes: `TransferEntry` (Task 3), `isPossibleDuplicate` (Task 4).
- Produces:
  - `planImport(existing: Vaccination[], entries: TransferEntry[]): ImportItem[]` mit `ImportItem { entry: TransferEntry; duplicateOf: Vaccination | null }`
  - `toVaccinations(entries: TransferEntry[], ctx: { personId: string; importId: string; now: Date; newId(): string }): Vaccination[]` (`source: "import"`, `importId`, `createdAt` und `updatedAt` gleich `now`)
  - `Repository.addVaccinations(vs: Vaccination[]): Promise<void>` in einer einzigen Transaktion
  - `actions.importVaccinations(vs: Vaccination[]): Promise<void>` in `AppData`

- [ ] **Step 1: Tests schreiben:** `planImport` markiert einen Eintrag mit gleichem Datum und überlappender Krankheit, auch bei „Monat“ gegen „Tag“, und markiert ihn nicht bei anderer Krankheit; `toVaccinations` setzt alle Felder; `addVaccinations` speichert alle Einträge, und scheitert die Transaktion (ein Eintrag mit einer Funktion als Wert), ist keiner gespeichert; `importVaccinations` ergänzt `vaccinations` und berechnet die Empfehlungen neu.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: merge transferred vaccinations on the phone`.

### Task 12: Impfungen übernehmen per Datei und Text, Vorschau, Ersteinrichtung

**Files:**
- Create: `src/app/transfer/TransferScreen.tsx` mit Test, `src/app/transfer/ImportPreview.tsx` mit Test
- Modify: `src/app/App.tsx` (Route `/uebernehmen`), `src/app/settings/SettingsScreen.tsx`, `src/app/setup/SetupScreen.tsx`, je mit Test, `src/texts.ts` (`T.transfer`)

**Interfaces:**
- Consumes: `addPart`, `missingParts`, `decodeCollected`, `readTransferText`, `TransferError` (Task 3), `planImport`, `toVaccinations`, `actions.importVaccinations` (Task 11), `BackupHint` aus `src/app/entry/`.
- Produces: `TransferScreen()` mit den Zuständen Sammeln, Vorschau und Fertig und einer Funktion `onCode(line: string)`, die Task 13 aus dem Scanner aufruft. `ImportPreview({ items, onImport, onCancel })`.

Verhalten:
- Überschrift „Impfungen übernehmen“, darunter: „Öffne am PC impfpass.github.io/import/, prüf dort deine Impfungen und übertrag sie dann hierher.“ Zwei Wege in diesem Task: „Datei öffnen“ (`accept=".txt,text/plain"`, größer als 1 MB → „Die Datei ist zu groß für eine Übertragung.“) und „Text einfügen“ (Textfeld und „Einlesen“).
- Fortschritt: „{gelesen} von {gesamt} Teilen gelesen. Es fehlt noch Teil {Liste}.“ (Spec 8.2: „2 von 3“) Fehler erscheinen mit den Texten aus `T.transfer.errors`. Bei `otherTransfer` gibt es „Neu beginnen“, das mit dem neuen Teil von vorn anfängt.
- Vorschau: „{n} Impfungen gefunden, davon {d} schon eingetragen.“ Jede Zeile mit Kästchen, Datum, Bezeichnung und Krankheiten. Dubletten sind abgewählt und tragen „Schon eingetragen: {Bezeichnung}, {Datum}.“ Knopf „{k} Impfungen übernehmen“ (gesperrt bei 0) und „Abbrechen“.
- Fertig: „{k} Impfungen übernommen.“, `BackupHint`, Link „Zu den Impfungen“.
- Einstellungen: neuer Abschnitt „Impfungen übernehmen“ mit dem Satz „Alte Impfungen vom PC holen, per QR-Code, Datei oder Text.“ und einem Link zu `/uebernehmen`.
- Ersteinrichtung, neuer Schritt 3 nach den Angaben: „Wie möchtest du anfangen?“ mit zwei Wegen. „Alte Impfungen vom PC übernehmen“ erklärt: „Am PC kann ein Chatbot die Fotos deines Impfpasses lesen, und du prüfst alles in einer großen Tabelle. Öffne dazu am PC impfpass.github.io/import/. Danach überträgst du die Impfungen mit QR-Codes hierher.“ Der Knopf legt die Person an und öffnet `/uebernehmen`. „Einträge selbst eingeben“ legt die Person an und öffnet `/impfungen/neu`. „Zurück“ führt zu Schritt 2.

- [ ] **Step 1: Tests schreiben:** eingefügter Text aus `encodeTransfer` zeigt die Vorschau mit Anzahl; eine vorhandene Impfung erscheint als „Schon eingetragen“ und ist abgewählt; „Übernehmen“ speichert die gewählten Einträge mit `source: "import"` und `importId`; eine Datei über `userEvent.upload` funktioniert ebenso; eine Übertragung mit Version 2 zeigt die Meldung `tooNew` und speichert nichts; ein Teil einer anderen Übertragung zeigt „Neu beginnen“; die Einstellungen verlinken `/uebernehmen`; die Ersteinrichtung führt je nach Wahl zu `/uebernehmen` oder `/impfungen/neu`, und die Person ist angelegt.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: import transferred vaccinations on the phone`.

### Task 13: QR-Codes mit der Kamera scannen

**Files:**
- Create: `src/app/transfer/Scanner.tsx` mit Test, `src/app/transfer/scanFrame.ts` mit Test
- Modify: `src/app/transfer/TransferScreen.tsx` mit Test, `src/texts.ts`

**Interfaces:**
- Consumes: `jsqr`, `matrixToImage` (Task 5), `TransferScreen` mit `onCode` (Task 12).
- Produces: `scanFrame(image: { data: Uint8ClampedArray; width: number; height: number }): string | null` und `Scanner({ onCode, onFallback }: { onCode(text: string): void; onFallback(way: "file" | "text"): void })`.

Verhalten:
- „QR-Code scannen“ wird der erste Weg auf der Seite „Impfungen übernehmen“.
- `Scanner` fragt beim Öffnen die Kamera an (`getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })`) und zeigt das Bild in einem `<video playsInline muted autoPlay>`. Alle 250 ms wird ein Bild auf höchstens 960 px Kantenlänge verkleinert und mit `scanFrame` gelesen (`inversionAttempts: "dontInvert"`). Derselbe Text innerhalb von 2 Sekunden wird nur einmal gemeldet.
- Beim Verlassen der Seite und wenn die App in den Hintergrund geht, stoppt die Kamera (`track.stop()`).
- Fehler: `NotAllowedError` oder `SecurityError` → „ImpfPass darf die Kamera nicht benutzen. Erlaube den Zugriff in den Einstellungen des Handys, oder übertrag die Impfungen als Datei oder Text.“ Keine Kamera (`NotFoundError`, `OverconstrainedError`, kein `navigator.mediaDevices`) → „Keine Kamera gefunden. Übertrag die Impfungen als Datei oder Text.“ Andere Fehler → „Die Kamera lässt sich nicht starten.“ Unter jeder Meldung stehen die Knöpfe „Datei öffnen“ und „Text einfügen“.

- [ ] **Step 1: Tests schreiben:** `scanFrame` liest einen mit `matrixToImage` gezeichneten Teil; ohne Code ergibt es `null`; `Scanner` zeigt bei abgelehnter Kamera (`NotAllowedError`) die Meldung und die beiden Knöpfe; ohne `navigator.mediaDevices` die Meldung zur fehlenden Kamera; beim Verlassen werden alle Spuren gestoppt (falscher Stream mit `stop`-Spionen); `TransferScreen` sammelt Teile aus einem nachgebildeten Scanner (`vi.mock("./Scanner")`) in beliebiger Reihenfolge bis zur Vorschau.
- [ ] **Step 2:** Tests rot.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests grün, Lint, Typecheck.
- [ ] **Step 5:** Commit `feat: scan transfer QR codes with the camera`.

### Task 14: Gesamtprüfung und Veröffentlichung

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `docs/dev-log/` (neue Datei zum Test)

- [ ] **Step 1:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` grün. `grep -rn "from \"@/app\|from \"\.\./app" src/import` ergibt nichts.
- [ ] **Step 2:** `CLAUDE.md` ergänzen: Ordner `src/import/` und `import/index.html`; das Übertragungsformat mit der Regel, dass sich die Bedeutung von Version 1 nie ändert und neue Felder Version 2 brauchen; dass Katalog-IDs auch in Übertragungen stehen; dass `T.pc.prompt` und `parseChatbotAnswer` zusammen geändert werden (der Test aus Task 2 prüft das Beispiel). `README.md` nennt die PC-App unter `https://impfpass.github.io/import/`.
- [ ] **Step 3:** Vorschau im Browser (`npm run preview`): in der PC-App `src/test/fixtures/chatbot-answer.txt` einfügen, die Tabelle prüfen und korrigieren, Codes ansehen, Datei speichern, Text kopieren; in der Handy-App denselben Text einfügen, Vorschau und Übernahme prüfen, ein zweites Mal einfügen und „Schon eingetragen“ sehen. Keine Meldungen der CSP in der Konsole, helles und dunkles Design.
- [ ] **Step 4:** Nach dem ausdrücklichen Ja des Nutzers pushen, der Deploy-Lauf muss grün sein.
- [ ] **Step 5: Prüfung durch den Nutzer** (Spec 13): am PC `https://impfpass.github.io/import/` in Edge öffnen und als App installieren; die Antwort aus `chatbot-answer.txt` einfügen und übertragen; auf dem iPhone in ImpfPass die QR-Codes vom PC-Bildschirm scannen, auch in umgekehrter Reihenfolge; die Datei per AirDrop oder iCloud öffnen; den Text über Notizen einfügen; dieselben Codes noch einmal scannen und die Dubletten sehen; die Kamera in den iPhone-Einstellungen sperren und die Meldung sehen. Freiwillig: zwei oder drei Seiten des eigenen Passes mit einem Chatbot lesen lassen. Das Ergebnis kommt nach `docs/dev-log/`.
