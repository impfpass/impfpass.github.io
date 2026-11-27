# ImpfPass Plan 2: Empfehlungen – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Übersicht zeigt nach STIKO berechnet, welche Impfungen fällig, bald fällig, geschützt oder erst später dran sind, in Ampelfarben und mit Text. Dazu kommen die Angaben zur Person, Karten „Mit dem Arzt besprechen“, Hinweise auf neue oder geänderte Empfehlungen und ein monatlicher STIKO-Wächter.

**Architecture:** Ein Regelbaustein unter `src/core/rules/` wertet Person, Impfungen und Entscheidungen mit einem versionierten Regelwerk aus. Er besteht aus reinen Funktionen, eine Datei je Empfehlung, jede mit Fundstelle. `AppData` berechnet daraus die Empfehlungen und hält den Regel-Stand mit Schnappschuss für die „Neu“-Erkennung aktuell. Die Oberfläche ordnet die Empfehlungen nach Ampelfarbe, zeigt Details mit Entscheidungen und fragt die Angaben zur Person ab. Der STIKO-Wächter ist ein Node-Skript mit GitHub-Workflow, das bei geänderten RKI-Seiten ein Issue eröffnet.

**Tech Stack:** wie Plan 1 (Vite, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, wouter, idb, zod 4, Vitest 4). Neu sind die shadcn-Bausteine `switch` und `checkbox`. Das Wächter-Skript läuft mit Node 22 über Type Stripping (`node --experimental-strip-types`), ohne neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-11-26-impfpass-design.md`, vor allem die Abschnitte 6, 7, 10 und 13.

**Planreihe:** Plan 2 von 5 (Liste in Plan 1, Zeilen 13–20). Nicht in diesem Plan: Erinnerungstage, GTD-Übergabe und die Sammelaktion für offene Arztfragen (Plan 4), PC-Import (Plan 3).

## Entscheidungen vor dem Plan

- Ampel (Nutzer, 27.11.2026): Rot heißt, der Termin ist erreicht oder vorbei. Das gilt für überfällige Auffrischungen, fällige erste Impfungen und fällige Folgedosen. Gelb heißt fällig innerhalb des Vorlaufs (`settings.leadMonths`, Standard 6). Grün heißt geschützt, auch wenn keine Auffrischung vorgesehen ist (Masern nach zwei Dosen). Grau heißt, die Impfung kommt erst später dazu (Gürtelrose für 55-Jährige). Saison-Impfungen werden ab dem Saison-Tag gelb, bis die Impfung der Saison eingetragen ist, und nie rot. Jede Zeile hat zusätzlich einen Text und ein Symbol, die Farbe allein trägt keine Information.
- Reihenfolge der Übersicht (Nutzer, 27.11.2026): nach Dringlichkeit, also Rot, Gelb, Grün, Grau, innerhalb jeder Gruppe alphabetisch.
- Lizenz (geprüft am 27.11.2026 mit `gh issue view 1 --repo Nockchlhas/Impfbuch`): Das Original hat keine Lizenz, Issue #1 ist offen und unbeantwortet. Die Regeln entstehen deshalb selbst aus den Primärquellen (Spec 4.1). Kein Code und keine Tests aus dem Original.
- Zurückgestellte Minors aus Plan 1: Alle 16 erledigt eine eigene Sitzung („ImpfPass Plan 1 umsetzen“) parallel, dazu die Umstellung der Actions auf Node 24. Sie gehören nicht in Plan 2. Für Plan 2 wichtig daraus: Die Texte liegen danach in `src/texts.ts`, Kern und Oberfläche importieren von dort, der Kern importiert nichts mehr aus `src/app/`. Die Regel „Katalog-IDs nie umbenennen“ steht dann in `CLAUDE.md`. Sicherungen mit unbekannter Krankheits-ID gelten als „aus neuerer Version“, `openRepository` reagiert auf einen Versionswechsel der Datenbank in einem anderen Tab. Plan 2 setzt voraus, dass diese Arbeit auf `main` liegt (Task 1 prüft das).
- Kern und Texte *(Festlegung Claude)*: Der Regelbaustein liefert keine Sätze, sondern Daten (Status, Daten, Art der Begründung), die Oberfläche formuliert daraus. Texte, die zum Regelwerk gehören und mit dessen Version wechseln (Zielgruppe nach STIKO, Texte der Änderungsliste), stehen im Regelwerk. Eine ESLint-Regel hält den Kern frei von Importen aus der Oberfläche.
- Die Stores `decisions` und `ruleStates` gibt es schon, eine neue Datenbankversion ist nicht nötig.

## Global Constraints

- Zur Laufzeit keine Anfragen an Dritte, keine externen Schriften, keine Analyse-Dienste. Links auf RKI-Seiten öffnet nur der Anwender selbst (Spec 5, 12).
- Alle Daten bleiben im Browser (IndexedDB). Sie verlassen das Gerät nur, wenn der Anwender es ausdrücklich auslöst (Spec 12).
- Oberfläche nur Deutsch. Alle Texte der Oberfläche stehen in `src/texts.ts`. Ausnahme: Zielgruppen- und Änderungstexte im Regelwerk (siehe oben).
- Der Kern (`src/core/`) importiert nichts aus `src/app/`, `src/components/`, `react` oder `react-dom`.
- Regeln nur aus Primärquellen: STIKO-Empfehlungen im Epidemiologischen Bulletin des RKI, Fachinformationen nur dort, wo die STIKO auf sie verweist (Spec 4.1, 7.1). Jede Regel nennt ihre Fundstelle (`SourceRef`), jeder Regeltest nennt sie im Testnamen (Spec 13).
- Erwachsene ab 18 Jahren (Spec 7.1). Schwangerschaft wird nicht berücksichtigt (Spec 7.2), das Geschlecht kennt das Datenmodell nicht.
- Unsichere Daten: Die Regeln rechnen mit dem gespeicherten frühesten Tag (`2016-12-01` bei „12/2016“), damit eher zu früh als zu spät erinnert wird (Spec 7.3).
- Kalenderdaten sind Strings `YYYY-MM-DD`. Gerechnet wird nur mit den Hilfen aus `src/core/dates.ts`.
- Katalog-IDs und Empfehlungs-IDs werden nie umbenannt (`CLAUDE.md`, Task 1).
- Voreinstellungen: Vorlauf 6 Monate, Saison-Tag `09-01` (Spec 6.1).
- Gut lesbar auch für Ältere: Grundschrift 18 px, Bedienflächen mindestens 44 × 44 px, helles und dunkles Design nach Systemeinstellung (Spec 14).
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`).
- Bezeichner im Code englisch, Texte der Oberfläche deutsch.
- CI mit Node 22. Die Tests laufen vor jedem Deploy (Spec 13).
- Commit-Nachrichten im Stil `feat: …`/`fix: …`/`chore: …`/`refactor: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Frühere Impfungen stehen nicht im Pass (Kinderpass verloren, neuer Pass als Erwachsener): Nach STIKO zählen nur dokumentierte Impfungen (EB 4/2026, S. 61), die App empfiehlt dann die Grundimmunisierung. Sie muss sagen, warum, und einen Ausweg anbieten: Begründung „Eingetragen sind … von … Impfungen der Grundimmunisierung“ mit dem Hinweis auf „Nicht nötig“ und dem Grund „In einem anderen Impfpass belegt“. Tests in Task 4 (Td mit einer Dosis) und Task 13 (Grund speichern).
2. Einträge ohne Impfstoff und alte Impfstoffe: Freitext-Einträge zählen für ihre Krankheiten, Zostavax zählt nicht für die Gürtelrose, ein Pneumokokken-Eintrag ohne Impfstoff zählt wie PPSV23. Tests in Task 3 (`dosesOf`) und Task 7.
3. Doppelt eingetragene Impfung: Zwei Einträge am selben Tag gegen dieselbe Krankheit zählen als eine Dosis, sonst wäre eine Grundimmunisierung zu früh vollständig. Test in Task 3.
4. Stichtage an Geburtstagen und Monatsenden: Wer am 29. Februar geboren ist, erreicht im Nicht-Schaltjahr die Altersgrenze am 28. Februar; Abstände über das Monatsende landen am letzten Tag des Monats. Tests in Task 2 und Task 7 (RSV).
5. Neue Person ohne Einträge oder unter 18: Ohne Einträge steht fast alles auf Rot, die Übersicht erklärt das. Unter 18 berechnet die App keine Empfehlungen und sagt es: „ImpfPass berechnet Empfehlungen ab 18 Jahren.“ Tests in Task 3 und Task 12.

## Regeln und Fundstellen

Grundlage ist die Recherche vom 27.11.2026 in den Primärquellen, mit Seite, Zitat und URL je Angabe abgelegt in `docs/stiko/2026-11-27-recherche-a.md` (Td, Keuchhusten, Polio, MMR, Windpocken, HPV, Hepatitis B, Grippe, Berufsindikationen) und `docs/stiko/2026-11-27-recherche-b.md` (Pneumokokken, COVID-19, Gürtelrose, RSV, FSME, Änderungsbeschlüsse, Seiten für den Wächter). Seitenzahlen sind PDF-Seiten. Das RKI ändert das PDF der Gesamtausgabe an derselben Adresse und vermerkt spätere Beschlüsse am Rand; gelesen wurde die Fassung `v=12` (Stand 11.09.2026).

Quellen:
- EB 4/2026: „Empfehlungen der Ständigen Impfkommission beim Robert Koch-Institut 2026“, Epid. Bull. 4/2026 vom 22.01.2026, `https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/04_26.pdf?__blob=publicationFile`
- EB 28/2026: COVID-19-Beschluss vom 09.07.2026, ersetzt den COVID-19-Teil von EB 4/2026, `https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/28_26.pdf?__blob=publicationFile`
- EB 45/2025: Herpes-zoster-Beschluss vom 06.11.2025, `https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2025/45_25.pdf?__blob=publicationFile`
- FI FSME-IMMUN: Fachinformation FSME-IMMUN 0,5 ml Erwachsene, Stand 10/2024, `https://www.fachinfo.de/fi/pdf/007018/fsme-immun-0-5-ml-erwachsene` (EB 4/2026, S. 11 verweist für das FSME-Schema auf die Fachinformationen)
- FI Encepur: Fachinformation Encepur Erwachsene, Stand 05/2026, `https://www.fachinfo.de/fi/pdf/005550/encepur-erwachsene`
- Beschlüsse nach EB 4/2026 bis EB 48/2026 (26.11.2026) geprüft: 28/2026 (COVID-19), 37/2026 (RSV-Prophylaxe für Säuglinge, kein Erwachsenenbezug), 42/2026 (zoonotische Influenza A(H5), nur Labor und Tierseuchenbekämpfung, nicht abgebildet).

Stand: „gelesen“ heißt im Originaltext gesehen. „Auslegung“ heißt, die STIKO-Stelle trägt die Regel, die genaue Umsetzung hat Claude festgelegt. „offen“ heißt, die Stelle sagt es nicht ausdrücklich; umgesetzt wird wie beschrieben, im Code mit `// offen:` markiert und unten unter „Offene Punkte“ gesammelt.

| ID | Regel | Fundstelle | Stand |
| --- | --- | --- | --- |
| `td` | Ohne oder mit unvollständiger Grundimmunisierung nachholen, begonnene Serie vervollständigen | EB 4/2026, S. 18, Tab. 2, Tetanus | gelesen |
| | Grundimmunisierung 3 Dosen: 2. nach 4–8 Wochen, 3. 6–12 Monate nach der 2. | EB 4/2026, S. 11, Tab. 2, Diphtherie | gelesen |
| | Nur dokumentierte Impfungen zählen, nicht dokumentierte werden nachgeholt | EB 4/2026, S. 61, Kap. 6.3 und 6.4 | gelesen |
| | Auffrischung jeweils 10 Jahre nach der vorangegangenen Impfung | EB 4/2026, S. 68, Text zu Tab. 11E | gelesen |
| | Reine Tetanus-Impfstoffe (Tetanol, historisch) zählen mit | – | Auslegung |
| `pertussis` | Erwachsene erhalten die nächste fällige Td-Impfung einmalig als Tdap | EB 4/2026, S. 16, Tab. 2, Pertussis | gelesen |
| | „Als Erwachsener“ heißt: Dosis ab dem 18. Geburtstag | EB 4/2026, S. 8, Tab. 1B (A3 im Erwachsenenalter) | Auslegung |
| | Personal im Gesundheitsdienst und in Gemeinschaftseinrichtungen alle 10 Jahre 1 Dosis | EB 4/2026, S. 17, Tab. 2, Pertussis, B | gelesen |
| `polio` | Fehlende oder unvollständige Grundimmunisierung nachholen, einmalige Auffrischung; vollständig nach Grundimmunisierung und 1 Auffrischung, danach keine Routine-Auffrischung | EB 4/2026, S. 18, Tab. 2, Poliomyelitis | gelesen |
| | Nachholschema N1, N2 (mindestens 1 Monat), N3 (mindestens 6 Monate), A1 einmalig | EB 4/2026, S. 68, Tab. 11E | gelesen |
| | Abstand der einmaligen Auffrischung zur 3. Dosis: 10 Jahre | EB 4/2026, S. 68, Tab. 11E (A1 in der Spalte „Impfintervall alle 10 Jahre“) | offen |
| `mmr` | Nach 1970 Geborene ab 18 mit unklarem Impfstatus, ohne Impfung oder mit nur 1 Dosis in der Kindheit: einmal MMR. „Nach 1970“ heißt Geburtsjahr ab 1971 | EB 4/2026, S. 15, Tab. 2, Masern | gelesen |
| | Beruf (medizinische Einrichtungen, Pflege, Gemeinschaftseinrichtungen, Kontakt zu potenziell infektiösem Material), nach 1970 Geborene: insgesamt 2 Dosen | EB 4/2026, S. 16, Tab. 2, MMR, B | gelesen |
| | Abstand der 2. Dosis mindestens 1 Monat | EB 4/2026, S. 68, Tab. 11E, Zeile Röteln (MMR-Impfstoff) | Auslegung |
| `varicella` | Beruf (wie MMR, ohne Fach-, Berufs- und Hochschulen), seronegativ: insgesamt 2 Dosen | EB 4/2026, S. 19, Tab. 2, Varizellen, B | gelesen |
| | 2 Dosen im Abstand von 4 bis 6 Wochen | EB 4/2026, S. 68, Text zu Tab. 11E | gelesen |
| | Serostatus unbekannt: Karte „Mit dem Arzt besprechen“ (Bluttest) | Spec 7.2 | Auslegung |
| `hepatitis_b` | Beruf: Personal in medizinischen Einrichtungen, Sanitäts- und Rettungsdienst, Ersthelfer, Polizei, Einrichtungen für Menschen mit Behinderungen | EB 4/2026, S. 13, Tab. 2, Hepatitis B, Nr. 3 | gelesen |
| | Immundefizienz oder Vorerkrankung mit schwerem Verlauf: Karte | EB 4/2026, S. 13, Nr. 1 | gelesen |
| | Nach erfolgreicher Grundimmunisierung keine Auffrischung | EB 4/2026, S. 13, Anmerkungen | gelesen |
| | Schema 0-1-6 Monate | EB 4/2026, S. 67, Text zu Tab. 11D (gilt dort für 11- bis 17-Jährige) | offen |
| `influenza` | Ab 60 jährlich im Herbst/Winter, einmal je Saison | EB 4/2026, S. 14, Tab. 2, Influenza, S | gelesen |
| | Grunderkrankung in jedem Alter: Karte | EB 4/2026, S. 14, Kategorie I | gelesen |
| | Häufiger direkter Tierkontakt (privat I, beruflich B); medizinisches Personal (B) | EB 4/2026, S. 14–15 | gelesen |
| | Saisonfenster: ab Saison-Tag, bis 31. März | – (STIKO nennt keine Monate) | Auslegung |
| `covid19` | Ab 75 jährlich, einmal je Saison, bevorzugt im Spätsommer/Frühherbst | EB 28/2026, S. 5, Auszug Tab. 2 | gelesen |
| | Grunderkrankung in jedem Alter: Karte | EB 28/2026, S. 3 | gelesen |
| | Personal in Pflegeeinrichtungen und medizinisches Personal mit erhöhtem Risiko oder mit Risikopatienten (B) → Frage „Arbeit mit Patienten“ | EB 28/2026, S. 5 | gelesen, Zuordnung Auslegung |
| | Möglichst 6 Monate Abstand zur letzten Impfung (Infektionen kennt die App nicht) | EB 28/2026, S. 4 | gelesen |
| `pneumococcal` | Ab 60 einmal PCV20, keine Wiederholung nach PCV20 | EB 4/2026, S. 17 und S. 31 | gelesen |
| | Grunderkrankung in jedem Alter: Karte | EB 4/2026, S. 31; S. 17, Kategorie I | gelesen |
| | Nach PPSV23 frühestens 6 Jahre | EB 4/2026, S. 17 | gelesen |
| | Nach PCV13 oder PCV15 nach 1 Jahr | EB 4/2026, S. 17 (Indikationsgruppe) | gelesen; für die Standardgruppe offen |
| | Capvaxive (PCV21) zählt wie PCV20 | – (STIKO nennt PCV21 nicht) | offen |
| | Eintrag ohne Impfstoff zählt wie PPSV23 | – | Auslegung |
| `zoster` | Ab 60 zwei Dosen Totimpfstoff | EB 4/2026, S. 13, Tab. 2, Herpes zoster, S | gelesen |
| | Abstand mindestens 2, höchstens 6 Monate | EB 4/2026, S. 68, Tab. 11E, Fußnote c | gelesen |
| | Grunderkrankung ab 18: Karte (ersetzt seit 06.11.2025 die Grenze 50) | EB 45/2025, S. 4; EB 4/2026, S. 14 | gelesen |
| | Keine Wiederholung | EB 45/2025, S. 4 | gelesen |
| | Zostavax zählt nicht | EB 4/2026, S. 25 | gelesen; Abstand zum Totimpfstoff offen |
| | Eintrag ohne Impfstoff zählt als Totimpfstoff | – | Auslegung |
| `rsv` | Ab 75 einmalig | EB 4/2026, S. 18, Tab. 2, RSV, S | gelesen |
| | 60–74 mit schweren Ausprägungen bestimmter chronischer Erkrankungen: Karte | EB 4/2026, S. 18, Kategorie I | gelesen |
| `tbe` | In FSME-Risikogebieten zeckenexponiert; Schema nach Fachinformation | EB 4/2026, S. 11, Tab. 2, FSME | gelesen |
| | FSME-IMMUN: 2. Dosis 1–3 Monate, 3. Dosis 5–12 Monate nach der 2., 1. Auffrischung nach 3 Jahren, dann alle 5 Jahre, ab 60 alle 3 Jahre | FI FSME-IMMUN, Abschnitt 4.2 | gelesen |
| | Encepur: 2. Dosis 14 Tage bis 3 Monate, 3. Dosis 9–12 Monate nach der 2., 1. Auffrischung nach 3 Jahren, dann 12–49 Jahre alle 5–10 Jahre, über 49 alle 3 Jahre | FI Encepur, Abschnitt 4.2, Tabelle 1 | gelesen; 5 Jahre als untere Grenze ist Auslegung |

Zielgruppen für die Karten (`discussTargetGroup`, wörtlich aus der Quelle):
- `zoster`: „Personen ≥ 18 Jahre mit erhöhter gesundheitlicher Gefährdung an Herpes zoster zu erkranken infolge einer angeborenen bzw. erworbenen, insbesondere einer iatrogenen, Immundefizienz oder infolge schwerer Ausprägung einer chronischen Grunderkrankung“ (EB 4/2026, S. 14)
- `influenza`: „Personen ≥ 6 Monate mit erhöhter gesundheitlicher Gefährdung infolge einer Grunderkrankung“ (EB 4/2026, S. 14)
- `covid19`: „Personen im Alter von ≥ 6 Monaten bei erhöhter gesundheitlicher Gefährdung für einen schweren COVID-19-Verlauf infolge einer Grunderkrankung“ (EB 28/2026, S. 3)
- `pneumococcal`: „Kinder, Jugendliche und Erwachsene mit erhöhter gesundheitlicher Gefährdung infolge einer Grunderkrankung“ (EB 4/2026, S. 17)
- `rsv`: „Personen im Alter von 60 – 74 Jahren mit schweren Ausprägungen von chronischen Erkrankungen der Atmungsorgane, chronischen Herz-Kreislauf- und Nierenerkrankungen, hämato-onkologischen Erkrankungen, Diabetes mellitus (mit Komplikationen)“, den Rest des Satzes beim Umsetzen aus EB 4/2026, S. 18 vollständig übernehmen
- `hepatitis_b`: „Personen, bei denen wegen einer vorbestehenden oder zu erwartenden Immundefizienz, z. B. eine geplante Immunsuppression, oder wegen einer vorbestehenden Erkrankung ein schwerer Verlauf einer Hepatitis-B-Erkrankung zu erwarten ist“ (EB 4/2026, S. 13)
- `varicella`: „Seronegative Personen (einschließlich Auszubildende, Praktikanten und Praktikantinnen, Studierende und ehrenamtlich Tätige)“ in medizinischen Einrichtungen, Einrichtungen der Pflege, Gemeinschaftseinrichtungen und bei Tätigkeiten mit Kontakt zu potenziell infektiösem Material (EB 4/2026, S. 19)

Das Epidemiologische Bulletin steht laut Impressum unter CC BY 4.0, die Fundstelle in der App ist zugleich die Namensnennung.

Offene Punkte (umgesetzt wie in der Tabelle, beim nächsten Regel-Update zu klären):
1. Polio: Abstand der einmaligen Auffrischung nach drei Dosen.
2. Hepatitis B: Schema für Erwachsene; Heplisav B (zwei Dosen laut Zulassung) wird wie ein Impfstoff mit drei Dosen behandelt, der Anwender kann „Nicht nötig“ wählen.
3. Pneumokokken: gesunde Personen ab 60 nach früherem PCV13 oder PCV15; Bewertung von Capvaxive (PCV21).
4. Gürtelrose: Abstand nach früherer Zostavax-Impfung (EB 50/2018: mindestens 5 Jahre, RKI-FAQ 2025: 2 Monate). Bis dahin wird Zostavax nur nicht gezählt.

Nicht abgebildet in Plan 2 (keine passende Angabe im Datenmodell oder außerhalb des Umfangs):
- Hepatitis A: Berufsindikation für Gesundheitsdienst und Kita steht in EB 4/2026, S. 13, das Impfschema wurde nicht recherchiert. Folgeaufgabe.
- MenACWY-Nachholimpfung bis unter 25 Jahre (EB 44/2025, S. 4). Folgeaufgabe.
- HPV: keine STIKO-Empfehlung ab 18 (EB 4/2026, S. 7 und S. 26). Spec 7.1 nennt „HPV (Nachholen)“, das Nachholen gilt nur bis zum Tag vor dem 18. Geburtstag. Eine vor 18 begonnene Serie (S. 61) wird nicht verfolgt.
- Schwangerschaft, Röteln und Windpocken für Frauen im gebärfähigen Alter, Kontaktpersonen von Neugeborenen, Bewohnende von Pflegeeinrichtungen, Reise-, Labor-, Forst- und Schweißer-Indikationen, zoonotische Influenza A(H5), FSME-Schnellschemata.

---

### Task 1: Voraussetzungen und Grenzen des Kerns

**Files:**
- Modify: `eslint.config.js`, `CLAUDE.md`

**Interfaces:**
- Consumes: `T` aus `@/texts` (Umzug durch die Plan-1-Sitzung, siehe „Entscheidungen vor dem Plan“).

- [ ] **Step 1:** Voraussetzung prüfen: `src/texts.ts` existiert, `grep -rn "app/texts" src` liefert nichts, `CLAUDE.md` enthält die Regel „Katalog-IDs nie umbenennen“. Fehlt etwas davon, nicht selbst nachbauen, sondern anhalten und den Nutzer fragen, ob die Arbeit der Plan-1-Sitzung schon auf `main` liegt.
- [ ] **Step 2:** In `eslint.config.js` einen Block für `src/core/**/*.ts` ergänzen, falls die Plan-1-Sitzung keinen angelegt hat: `no-restricted-imports` mit `paths: ["react", "react-dom"]` und `patterns: [{ group: ["@/app/*", "@/components/*", "**/app/*"], message: "Der Kern importiert nichts aus der Oberfläche." }]`. Testdateien im Kern dürfen `@/test/*` importieren.
- [ ] **Step 3:** Probe: vorübergehend `import "@/app/App";` in `src/core/dates.ts` einfügen, `npm run lint` → FAIL mit „Der Kern importiert nichts aus der Oberfläche.“ Zeile wieder entfernen.
- [ ] **Step 4:** `CLAUDE.md` ergänzen: Die Regel zu den Katalog-IDs um die Empfehlungs-IDs (`RecommendationId`) erweitern, weil sie in Entscheidungen, Regel-Ständen und Sicherungsdateien stehen. Beim Kern den Satz „ESLint prüft das“ ergänzen. Bei den Umsetzungsplänen Plan 2 (`2026-11-27-impfpass-02-empfehlungen.md`) als aktuellen Plan nennen und `docs/stiko/` als Ablage der Regel-Recherchen.
- [ ] **Step 5:** `npm run lint && npm run typecheck && npm test && npm run build` → alles grün.
- [ ] **Step 6: Commit** `chore: guard core against app imports, note recommendation IDs`

### Task 2: Datumshilfen für Regeln

**Files:**
- Modify: `src/core/dates.ts`
- Test: `src/core/dates.test.ts`

**Interfaces:**
- Produces:
```ts
export function addDays(date: ISODate, days: number): ISODate
export function addMonths(date: ISODate, months: number): ISODate // über das Monatsende hinaus: letzter Tag des Monats; negativ erlaubt
export function addYears(date: ISODate, years: number): ISODate   // 29.02. wird zum 28.02., wenn das Zieljahr kein Schaltjahr ist
export function ageOn(birthDate: ISODate, date: ISODate): number   // vollendete Jahre; ageOn(b, addYears(b, n)) === n
```

- [ ] **Step 1: Failing tests schreiben**

```ts
it('addMonths hält das Monatsende ein', () => {
  expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  expect(addMonths('2027-03-01', -6)).toBe('2026-09-01')
  expect(addMonths('2026-08-31', -6)).toBe('2026-02-28')
})
it('addYears am 29. Februar', () => {
  expect(addYears('1964-02-29', 60)).toBe('2024-02-29')
  expect(addYears('1968-02-29', 59)).toBe('2027-02-28')
})
it('addDays über Monats- und Jahreswechsel', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})
it('ageOn am Tag vor und am Geburtstag', () => {
  expect(ageOn('1967-03-01', '2027-02-28')).toBe(59)
  expect(ageOn('1967-03-01', '2027-03-01')).toBe(60)
  expect(ageOn('1968-02-29', '2027-02-27')).toBe(58)
  expect(ageOn('1968-02-29', '2027-02-28')).toBe(59)
})
```

- [ ] **Step 2:** `npm test -- src/core/dates.test.ts` → FAIL.
- [ ] **Step 3:** Implementieren. Gerechnet wird mit `Date.UTC` und `getUTC…`, damit keine Zeitumstellung dazwischenkommt. `ageOn` ist die größte Zahl `n` mit `addYears(birthDate, n) <= date`.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): add date arithmetic for rules`

### Task 3: Gerüst des Regelbausteins

**Files:**
- Create: `src/core/rules/types.ts`, `src/core/rules/helpers.ts`, `src/core/rules/evaluate.ts`, `src/core/rules/rulebook.ts`, `src/test/rules.ts`
- Test: `src/core/rules/helpers.test.ts`, `src/core/rules/evaluate.test.ts`

**Interfaces:**
- Consumes: `addDays`, `addMonths`, `addYears`, `ageOn` (Task 2); `Person`, `Vaccination`, `Decision`, `DiseaseId`, `getProduct`.
- Produces:
```ts
// types.ts
export type RecommendationId =
  | 'td' | 'pertussis' | 'polio' | 'mmr' | 'varicella' | 'hepatitis_b'
  | 'influenza' | 'covid19' | 'pneumococcal' | 'zoster' | 'rsv' | 'tbe'
export type RecStatus = 'protected' | 'soon' | 'due' | 'overdue' | 'future' | 'discuss' | 'not_applicable' | 'declined' | 'not_needed'
export type Timing = 'normal' | 'season' | 'follow_up'
export type Reason =
  | { kind: 'booster'; lastDate: ISODate; intervalYears: number }
  | { kind: 'age'; age: number }
  | { kind: 'series'; given: number; total: number }
  | { kind: 'catch_up'; given: number; total: number }
  | { kind: 'with_td' }                                   // Keuchhusten mit der nächsten Td-Impfung
  | { kind: 'season'; label: string }                     // label etwa '2026/27'
  | { kind: 'indication'; indication: 'job' | 'tbe' | 'doctor' }
  | { kind: 'complete' }
  | { kind: 'discuss'; topic: 'chronic' | 'serology'; normalAge: number | null }
  | { kind: 'none' }
export interface SourceRef { edition: string; date: ISODate; section: string; page: number | null; url: string }
export interface Recommendation {
  id: RecommendationId
  diseases: DiseaseId[]
  status: RecStatus
  dueDate: ISODate | null      // Fälligkeit; bei Serien frühester Termin der nächsten Dosis; null = sofort bzw. ohne Datum
  latestDate: ISODate | null   // spätester Termin der nächsten Dosis, sonst null
  dose: { number: number; of: number } | null
  timing: Timing
  reason: Reason
  source: SourceRef
}
export interface RuleContext {
  person: Person; vaccinations: Vaccination[]; decision: Decision | undefined
  today: ISODate; leadMonths: number; seasonDay: string   // 'MM-DD'
}
export type RuleResult = Omit<Recommendation, 'id' | 'diseases' | 'source'> & { source?: SourceRef }
export interface Rule {
  id: RecommendationId
  diseases: DiseaseId[]
  source: SourceRef
  discussTopic?: 'chronic' | 'serology'
  discussTargetGroup?: string       // Zielgruppe, wie die STIKO sie beschreibt (Text der Karte)
  evaluate(ctx: RuleContext): RuleResult
}
export interface Change { version: string; ids: string[]; validSince: ISODate; text: string }
export interface Rulebook {
  version: string                   // 'YYYY-MM-DD.N'
  edition: string                   // STIKO-Stand für die Anzeige
  sources: { label: string; url: string }[]
  changes: Change[]
  rules: Rule[]
}
// helpers.ts
export type Interval = { days?: number; months?: number; years?: number }
export function addInterval(date: ISODate, i: Interval): ISODate
export function dosesOf(vs: Vaccination[], disease: DiseaseId, opts?: { exclude?: string[] }): Vaccination[] // aufsteigend, eine Dosis je Tag, ohne productIds aus exclude
export function startStatus(due: ISODate | null, today: ISODate, leadMonths: number): 'future' | 'soon' | 'due'   // null → 'due'
export function boosterStatus(due: ISODate, today: ISODate, leadMonths: number): 'protected' | 'soon' | 'overdue'
export function nextDoseStatus(earliest: ISODate, latest: ISODate | null, today: ISODate, leadMonths: number): 'future' | 'soon' | 'due' | 'overdue'
export function nextInSeries(doses: Vaccination[], steps: { min: Interval; max?: Interval }[], today: ISODate, leadMonths: number):
  Pick<RuleResult, 'status' | 'dueDate' | 'latestDate' | 'dose' | 'timing'>
export function compareVersions(a: string, b: string): number
// evaluate.ts
export function evaluate(person: Person, vaccinations: Vaccination[], decisions: Decision[], today: ISODate,
  rulebook: Rulebook, options: { leadMonths: number; seasonDay: string }): Recommendation[]
// rulebook.ts
export const RULEBOOK: Rulebook    // Regeln kommen in Task 4 bis 8 dazu
// src/test/rules.ts (Testhilfen)
export function person(birthDate: ISODate, answers?: { chronicIllness?: boolean; fsme?: PersonAnswers['fsme']; job?: Partial<PersonAnswers['job']> }): Person
export function shot(date: ISODate, productId: string, precision?: DatePrecision): Vaccination   // Krankheiten aus dem Katalog
export function freeShot(date: ISODate, diseases: DiseaseId[]): Vaccination                      // productId null
export function run(rule: Rule, input: { person: Person; vaccinations?: Vaccination[]; decision?: Decision['kind'];
  today: ISODate; leadMonths?: number; seasonDay?: string }): RuleResult                          // Standard 6 und '09-01'
```

Statusregeln (Spec 7.3, Ampel oben):
- `startStatus`: `today >= due` → `due`; `today >= addMonths(due, -leadMonths)` → `soon`; sonst `future`.
- `boosterStatus`: `today >= due` → `overdue`; `today >= addMonths(due, -leadMonths)` → `soon`; sonst `protected`.
- `nextDoseStatus`: `latest` vorhanden und `today > latest` → `overdue`; `today >= earliest` → `due`; `today >= addMonths(earliest, -leadMonths)` → `soon`; sonst `future`.
- `nextInSeries`: `steps[i]` ist der Abstand der Dosis `i + 2` zur vorigen, Gesamtzahl `steps.length + 1`. Ohne Dosis: `{ status: 'due', dueDate: null, latestDate: null, dose: { number: 1, of: total }, timing: 'normal' }`. Sonst Termin der nächsten Dosis aus der letzten Dosis, `timing: 'follow_up'`. Aufrufer rufen es nur bei unvollständiger Serie auf.
- `evaluate`: Unter 18 Jahren am Tag `today` liefert es `[]` (Spec 7.1). Es zählen nur Impfungen der Person mit `date <= today`. Je Regel in der Reihenfolge von `rulebook.rules`: `rule.evaluate` mit der Entscheidung zu `rule.id`, dann `id`, `diseases` und `source` (die Regel-Fundstelle, außer der Zweig liefert eine eigene) ergänzen. Ist der Status nicht `not_applicable`, macht eine Entscheidung `declined` daraus `declined` und `not_needed` daraus `not_needed`; alle anderen Felder bleiben. Arzt-Entscheidungen werten die Regeln selbst aus. Entscheidungen zu IDs ohne Regel stören nicht.
- `compareVersions` vergleicht erst das Datum, dann die laufende Nummer als Zahl.

- [ ] **Step 1: Failing tests schreiben**

```ts
// helpers.test.ts
it('startStatus an den Grenzen des Vorlaufs', () => {
  expect(startStatus('2027-03-01', '2026-08-31', 6)).toBe('future')
  expect(startStatus('2027-03-01', '2026-09-01', 6)).toBe('soon')
  expect(startStatus('2027-03-01', '2027-02-28', 6)).toBe('soon')
  expect(startStatus('2027-03-01', '2027-03-01', 6)).toBe('due')
  expect(startStatus(null, '2026-01-01', 6)).toBe('due')
})
it('boosterStatus an den Grenzen', () => {
  expect(boosterStatus('2030-05-04', '2029-11-03', 6)).toBe('protected')
  expect(boosterStatus('2030-05-04', '2029-11-04', 6)).toBe('soon')
  expect(boosterStatus('2030-05-04', '2030-05-04', 6)).toBe('overdue')
})
it('nextDoseStatus mit Höchstabstand', () => {
  expect(nextDoseStatus('2027-01-01', '2027-05-01', '2026-06-30', 6)).toBe('future')
  expect(nextDoseStatus('2027-01-01', '2027-05-01', '2026-07-01', 6)).toBe('soon')
  expect(nextDoseStatus('2027-01-01', '2027-05-01', '2027-05-01', 6)).toBe('due')
  expect(nextDoseStatus('2027-01-01', '2027-05-01', '2027-05-02', 6)).toBe('overdue')
  expect(nextDoseStatus('2027-01-01', null, '2040-01-01', 6)).toBe('due')
})
it('dosesOf zählt doppelte Einträge am selben Tag einmal und lässt ausgeschlossene Impfstoffe weg', () => {
  // zwei Einträge 2020-05-04 mit tetanus → eine Dosis; Zostavax mit exclude ['zostavax'] → fehlt; Ergebnis aufsteigend
})
it('nextInSeries ohne Dosis und mit einer Dosis', () => {
  const steps = [{ min: { months: 2 }, max: { months: 6 } }]
  expect(nextInSeries([], steps, '2026-11-27', 6)).toEqual({ status: 'due', dueDate: null, latestDate: null, dose: { number: 1, of: 2 }, timing: 'normal' })
  expect(nextInSeries([shot('2026-10-01', 'shingrix')], steps, '2026-11-27', 6))
    .toEqual({ status: 'soon', dueDate: '2026-12-01', latestDate: '2027-04-01', dose: { number: 2, of: 2 }, timing: 'follow_up' })
})
it('compareVersions', () => {
  expect(compareVersions('2026-12-01.2', '2026-12-01.10')).toBeLessThan(0)
  expect(compareVersions('2027-01-01.1', '2026-12-31.9')).toBeGreaterThan(0)
  expect(compareVersions('2026-12-01.1', '2026-12-01.1')).toBe(0)
})
// evaluate.test.ts (Test-Regelwerk mit einer Regel, die immer 'due' liefert, und einer, die 'not_applicable' liefert)
it('unter 18 gibt es keine Empfehlungen, ab dem 18. Geburtstag schon', () => {
  expect(evaluate(person('2008-11-28'), [], [], '2026-11-27', book, opts)).toEqual([])
  expect(evaluate(person('2008-11-27'), [], [], '2026-11-27', book, opts)).toHaveLength(2)
})
it('„Möchte ich nicht“ und „Nicht nötig“ überschreiben den Status, „trifft nicht zu“ bleibt', () => { /* … */ })
it('Entscheidungen zu unbekannten Empfehlungen stören nicht', () => { /* … */ })
it('Impfungen anderer Personen und Einträge nach heute zählen nicht', () => { /* … */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. `RULEBOOK` startet mit `rules: []`, `changes: []` und vorläufiger Version; Task 8 setzt die endgültigen Werte.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): add rule engine skeleton`

### Gemeinsam für Task 4 bis 8

- Jede Regel liegt in `src/core/rules/recommendations/<id>.ts` (`export const tdRule: Rule` usw.) und wird in `RULEBOOK.rules` in der Reihenfolge der Regeltabelle eingetragen. Tests in `src/core/rules/recommendations/<id>.test.ts`.
- Jeder Testname endet mit der Fundstelle in Kurzform aus der Regeltabelle, etwa `it('Td: Auffrischung genau 10 Jahre nach der letzten Dosis (Epid Bull 4/2026, S. 68)')` (Spec 13). Die Tests liegen an den Grenzen: Tag vor und am Stichtag, Mindest- und Höchstabstand, Monats- und Jahresangaben, Entscheidungen.
- „Jetzt“ in den Tests heißt `today` als feste Zeichenkette, nie `todayISO()`.
- Die Werte und Fundstellen stehen in der Regeltabelle oben. Was dort „offen“ ist, wird so umgesetzt, wie die Tabelle es beschreibt, und im Code mit `// offen: …` und dem Grund markiert.

### Task 4: Tetanus und Diphtherie, Keuchhusten, Polio

**Files:**
- Create: `src/core/rules/recommendations/td.ts`, `pertussis.ts`, `polio.ts` mit Tests
- Modify: `src/core/rules/rulebook.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces: `tdRule`, `pertussisRule`, `polioRule`; außerdem `export function tdNextDate(ctx: RuleContext): ISODate | null` in `td.ts` (Termin der nächsten Td-Dosis, `null` = sofort), den `pertussisRule` nutzt.

Ablauf je Regel (Werte und Fundstellen siehe Regeltabelle):
- `td`: Dosen = `dosesOf(vs, 'tetanus')`. Unter 3 Dosen: `nextInSeries` mit den Schritten 4–8 Wochen (`{ days: 28 }` bis `{ days: 56 }`) und 6–12 Monate, `reason: catch_up`. Ab 3 Dosen: `dueDate = last + 10 Jahre`, `boosterStatus`, `reason: booster`.
- `pertussis`: Bei Tätigkeit mit Patienten oder in einer Gemeinschaftseinrichtung: ohne Dosis `due`, sonst `last + 10 Jahre` mit `boosterStatus`, `reason: indication/job`. Sonst: Gibt es eine Keuchhusten-Dosis ab dem 18. Geburtstag, `protected` mit `reason: complete` und `dueDate: null`. Sonst `dueDate = tdNextDate(ctx)`, `startStatus`, `reason: with_td`.
- `polio`: Dosen = `dosesOf(vs, 'polio')`. 0 bis 2 Dosen: `nextInSeries` mit Mindestabständen 1 Monat und 6 Monate ohne Höchstabstand (Grundimmunisierung, 3 Dosen), `reason: { kind: 'catch_up', given, total: 3 }`. Bei 3 Dosen: einmalige Auffrischung, `dueDate = last + 10 Jahre` (offen, siehe Tabelle), `boosterStatus`, `dose: null`, `reason: { kind: 'series', given: 3, total: 4 }`. Ab 4 Dosen `protected`, `reason: complete`, `dueDate: null`.

- [ ] **Step 1: Failing tests schreiben** (Auswahl; je Regel mindestens diese Fälle)

```ts
const p = person('1967-03-01')
it('Td: ohne Eintrag ist die Grundimmunisierung jetzt fällig (Epid Bull 4/2026, S. 18)', () => {
  expect(run(tdRule, { person: p, today: '2026-11-27' })).toMatchObject({ status: 'due', dueDate: null, dose: { number: 1, of: 3 }, reason: { kind: 'catch_up', given: 0, total: 3 } })
})
it('Td: nur eine dokumentierte Dosis ergibt die 2. Dosis der Grundimmunisierung (Epid Bull 4/2026, S. 61)', () => {
  expect(run(tdRule, { person: p, vaccinations: [shot('2020-05-04', 'td-immun')], today: '2026-11-27' }))
    .toMatchObject({ status: 'overdue', dueDate: '2020-06-01', latestDate: '2020-06-29', timing: 'follow_up', dose: { number: 2, of: 3 } })
})
it('Td: Auffrischung genau 10 Jahre nach der letzten Dosis (Epid Bull 4/2026, S. 68)', () => {
  const vs = [shot('1990-01-01', 'td-pur', 'year'), shot('1991-01-01', 'td-pur', 'year'), shot('2016-11-27', 'boostrix')]
  expect(run(tdRule, { person: p, vaccinations: vs, today: '2026-11-26' }).status).toBe('soon')
  expect(run(tdRule, { person: p, vaccinations: vs, today: '2026-11-27' })).toMatchObject({ status: 'overdue', dueDate: '2026-11-27', reason: { kind: 'booster', lastDate: '2016-11-27', intervalYears: 10 } })
})
it('Td: Vorlauf 6 Monate, Tag vor und am Beginn (Epid Bull 4/2026, S. 68)', () => { /* protected am 2026-05-26, soon am 2026-05-27 */ })
it('Keuchhusten: mit der nächsten fälligen Td-Impfung (Epid Bull 4/2026, S. 16)', () => {
  // drei Td-Dosen, letzte 2016-11-27 → dueDate '2026-11-27', reason with_td
})
it('Keuchhusten: eine Tdap-Dosis als Erwachsener genügt, als Kind nicht (Epid Bull 4/2026, S. 16)', () => { /* Boostrix mit 30 → protected complete; nur mit 10 Jahren → with_td */ })
it('Keuchhusten: bei Tätigkeit in einer Gemeinschaftseinrichtung alle 10 Jahre (Epid Bull 4/2026, S. 17)', () => { /* … */ })
it('Polio: vollständig nach Grundimmunisierung und einer Auffrischung (Epid Bull 4/2026, S. 18)', () => { /* 4 Dosen → protected complete, dueDate null */ })
it('Polio: nach 3 Dosen einmalige Auffrischung (Epid Bull 4/2026, S. 68)', () => { /* … reason series 3 von 4 */ })
it('Polio: Schluckimpfung (historisch) und Kombi-Impfstoffe zählen (Epid Bull 4/2026, S. 18)', () => { /* polio-oral + boostrix-polio */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Regeln implementieren und in `RULEBOOK.rules` eintragen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(rules): add tetanus, diphtheria, pertussis and polio`

### Task 5: Masern/Mumps/Röteln, Windpocken, Hepatitis B

**Files:**
- Create: `src/core/rules/recommendations/mmr.ts`, `varicella.ts`, `hepatitisB.ts` mit Tests
- Modify: `src/core/rules/rulebook.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces: `mmrRule`, `varicellaRule`, `hepatitisBRule`.

Ablauf (Beruf: `j = person.answers.job`; Werte siehe Regeltabelle):
- `mmr`: Geburtsjahr bis 1970 → `not_applicable`. Dosen = `dosesOf(vs, 'measles')`. Beruf (`j.patients || j.communityFacility || j.bloodContact`): vollständig ab 2 Dosen, ohne Dosis `due` mit `dose: { number: 1, of: 2 }`, mit einer Dosis 2. Dosis frühestens 1 Monat danach (`nextInSeries`), `reason: indication/job`. Ohne Beruf: vollständig ab 2 Dosen oder mit einer Dosis ab dem 18. Geburtstag; sonst `due`, `dueDate: null`, `reason: catch_up` mit `given` = Zahl der Dosen und `total` = `given + 1`. Vollständig → `protected`, `reason: complete`, `dueDate: null`.
- `varicella`: Ohne Beruf (`j.patients || j.communityFacility || j.bloodContact`) → `not_applicable`. Ab 2 Dosen `protected`/`complete`. Mit einer Dosis 2. Dosis 4–6 Wochen danach (`{ days: 28 }` bis `{ days: 42 }`). Ohne Dosis: Entscheidung `doctor_recommends` → `nextInSeries` mit Gesamtzahl 2, `reason: indication/doctor`; `doctor_not_applicable` → `not_applicable`; sonst `discuss` mit `topic: 'serology'`, `normalAge: null`, `dueDate: null`. `discussTopic: 'serology'`.
- `hepatitis_b`: Beruf = `j.patients || j.bloodContact`. Angezeigt, wenn Beruf oder Entscheidung `doctor_recommends`. Nicht angezeigt und Schalter `chronicIllness` an und keine Arzt-Entscheidung → `discuss` (`topic: 'chronic'`, `normalAge: null`); sonst `not_applicable`. Angezeigt: ab 3 Dosen `protected`/`complete`, sonst `nextInSeries` mit Schritten frühestens 1 Monat und frühestens 5 Monate (Schema 0-1-6, Auslegung), `reason: indication/job` bzw. `indication/doctor`. `discussTopic: 'chronic'`.

- [ ] **Step 1: Failing tests schreiben** (Auswahl)

```ts
it('MMR: vor 1971 Geborene nicht, ab 1971 schon (Epid Bull 4/2026, S. 15)', () => {
  expect(run(mmrRule, { person: person('1970-12-31'), today: '2026-11-27' }).status).toBe('not_applicable')
  expect(run(mmrRule, { person: person('1971-01-01'), today: '2026-11-27' })).toMatchObject({ status: 'due', reason: { kind: 'catch_up', given: 0, total: 1 } })
})
it('MMR: eine Dosis in der Kindheit reicht nicht, eine als Erwachsener schon (Epid Bull 4/2026, S. 15)', () => { /* … */ })
it('MMR: bei Arbeit mit Patienten zwei Dosen, die zweite frühestens 1 Monat nach der ersten (Epid Bull 4/2026, S. 16)', () => { /* … */ })
it('Windpocken: ohne Beruf keine Empfehlung (Epid Bull 4/2026, S. 19)', () => { /* … */ })
it('Windpocken: Beruf ohne Impfung ergibt Karte „Bluttest klären“, Arzt empfiehlt → 1. Dosis fällig (Epid Bull 4/2026, S. 19)', () => { /* … */ })
it('Windpocken: zweite Dosis 4 bis 6 Wochen nach der ersten (Epid Bull 4/2026, S. 68)', () => { /* Grenzen 28 und 42 Tage */ })
it('Hepatitis B: Kontakt mit Blut ergibt Grundimmunisierung (Epid Bull 4/2026, S. 13)', () => { /* … */ })
it('Hepatitis B: chronische Erkrankung ergibt Karte, „Trifft nicht zu“ blendet sie aus (Epid Bull 4/2026, S. 13)', () => { /* … */ })
it('Hepatitis B: Kita allein ist keine Indikation (Epid Bull 4/2026, S. 13)', () => { /* communityFacility → not_applicable */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Regeln implementieren und eintragen. `discussTargetGroup` wörtlich aus der Regeltabelle.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(rules): add measles/mumps/rubella, varicella and hepatitis B`

### Task 6: Saison-Impfungen Grippe und COVID-19

**Files:**
- Create: `src/core/rules/season.ts`, `src/core/rules/recommendations/influenza.ts`, `covid19.ts` mit Tests
- Test: `src/core/rules/season.test.ts`
- Modify: `src/core/rules/rulebook.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces:
```ts
export function seasonResult(doses: Vaccination[], today: ISODate, seasonDay: string, minGap?: Interval):
  Pick<RuleResult, 'status' | 'dueDate' | 'latestDate' | 'dose' | 'timing' | 'reason'>
export const influenzaRule: Rule
export const covid19Rule: Rule
```

Saisonlogik *(Festlegung Claude, die STIKO nennt keine Monate: „Herbst/Winter“ bzw. „Spätsommer/Frühherbst“)*:
- Saison `Y` beginnt am Saison-Tag des Jahres `Y` (`Y-` + `seasonDay`). Die laufende Saison ist die mit dem jüngsten Beginn `<= today`. `label` ist `'2026/27'` für `Y = 2026`.
- Eine Dosis zählt für Saison `Y`, wenn sie ab einem Monat vor dem Beginn von `Y` und vor einem Monat vor dem Beginn von `Y + 1` gegeben wurde. So zählt eine frühe Impfung Ende August mit.
- Reihenfolge: Dosis für die kommende Saison `Y + 1` vorhanden → `protected`, Label `Y + 1`, `dueDate` = Beginn von `Y + 2`. Dosis für `Y` vorhanden → `protected`, `dueDate` = Beginn von `Y + 1`. Sonst bis einschließlich 31. März des Jahres `Y + 1` → `due` mit `dueDate` = Beginn von `Y`; mit `minGap` (COVID-19: 6 Monate) ist `dueDate` der spätere Tag von Saisonbeginn und letzter Dosis plus `minGap`, und vor diesem Tag ist der Status `soon`. Ab 1. April → `future`, Label `Y + 1`, `dueDate` = Beginn von `Y + 1`.
- Immer `timing: 'season'`, `reason: { kind: 'season', label }`, `dose: null`, `latestDate: null`.

Regeln (Werte siehe Regeltabelle):
- `influenza`: angezeigt ab 60, bei Arbeit mit Patienten, bei Tierkontakt oder mit Entscheidung `doctor_recommends`; dann `seasonResult`. Nicht angezeigt: Schalter an und keine Arzt-Entscheidung → `discuss` (`topic: 'chronic'`, `normalAge: 60`, `dueDate` = 60. Geburtstag); sonst `future` mit `dueDate` = 60. Geburtstag und `reason: { kind: 'age', age: 60 }`.
- `covid19`: wie `influenza` mit Alter 75, Beruf nur Arbeit mit Patienten, kein Tierkontakt, `minGap: { months: 6 }`.

- [ ] **Step 1: Failing tests schreiben**

```ts
// season.test.ts (seasonDay '09-01')
it('vor dem Saison-Tag geimpft in der Vorsaison: geschützt bis zum Saison-Tag', () => {
  expect(seasonResult([shot('2025-10-15', 'fluad')], '2026-08-31', '09-01')).toMatchObject({ status: 'protected', dueDate: '2026-09-01', reason: { label: '2025/26' } })
})
it('ab dem Saison-Tag ohne Impfung fällig', () => {
  expect(seasonResult([shot('2025-10-15', 'fluad')], '2026-09-01', '09-01')).toMatchObject({ status: 'due', dueDate: '2026-09-01', reason: { label: '2026/27' } })
})
it('Impfung Mitte August zählt für die neue Saison', () => { /* shot 2026-08-15, today 2026-09-10 → protected 2026/27 */ })
it('bis 31. März noch fällig, ab 1. April für die nächste Saison', () => {
  expect(seasonResult([], '2027-03-31', '09-01').status).toBe('due')
  expect(seasonResult([], '2027-04-01', '09-01')).toMatchObject({ status: 'future', dueDate: '2027-09-01', reason: { label: '2027/28' } })
})
it('Mindestabstand verschiebt die Fälligkeit, vorher bald fällig', () => {
  expect(seasonResult([shot('2026-05-10', 'comirnaty')], '2026-09-15', '09-01', { months: 6 })).toMatchObject({ status: 'soon', dueDate: '2026-11-10' })
})
it('anderer Saison-Tag', () => { /* seasonDay '10-01', today 2026-09-15 → noch Saison 2025/26 */ })
// influenza.test.ts / covid19.test.ts
it('Grippe: ab 60 jährlich (Epid Bull 4/2026, S. 14)', () => { /* Tag vor und am 60. Geburtstag: future → due */ })
it('Grippe: Tierkontakt und Arbeit mit Patienten (Epid Bull 4/2026, S. 14–15)', () => { /* … */ })
it('Grippe: chronische Erkrankung unter 60 ergibt Karte (Epid Bull 4/2026, S. 14)', () => { /* … */ })
it('COVID-19: Standard erst ab 75 (Epid Bull 28/2026, S. 5)', () => { /* 74 → future dueDate 75. Geburtstag; 75 → season */ })
it('COVID-19: möglichst 6 Monate Abstand zur letzten Impfung (Epid Bull 28/2026, S. 4)', () => { /* … */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren und eintragen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(rules): add seasonal influenza and COVID-19`

### Task 7: Pneumokokken, Gürtelrose, RSV

**Files:**
- Create: `src/core/rules/recommendations/pneumococcal.ts`, `zoster.ts`, `rsv.ts` mit Tests
- Modify: `src/core/rules/rulebook.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces: `pneumococcalRule`, `zosterRule`, `rsvRule`.

Gemeinsames Muster „Alter oder Arzt“ (für alle drei, `G` = Geburtstag zum Alter `A`):
- Entscheidung `doctor_recommends` → `status: 'due'`, `dueDate: null`, `reason: indication/doctor`.
- Sonst Schalter an, im Alter, für das die STIKO eine Indikation bei Grunderkrankung nennt, unter `A` und keine Arzt-Entscheidung → `discuss` (`topic: 'chronic'`, `normalAge: A`, `dueDate: G`).
- Sonst `startStatus(G)` mit `dueDate: G` und `reason: { kind: 'age', age: A }`. Vor dem Vorlauf ist das grau, im Vorlauf gelb mit „Termin ausmachen“, ab `G` rot (Spec 6.1, Skizze „Gürtelrose, 1. Dosis ab 03/2027, Termin ausmachen ab 09/2026“).

- `pneumococcal` (`A = 60`, Indikation in jedem Erwachsenenalter): Gibt es eine Dosis `prevenar-20` oder `capvaxive`, `protected`/`complete` in jedem Alter. Sonst Muster oben; dabei verschiebt eine frühere Dosis das Datum auf den späteren Tag: letzte Dosis `pneumovax-23` oder ohne Impfstoff (`productId: null`, zählt wie PPSV23, Auslegung) → Dosis + 6 Jahre; letzte Dosis `prevenar-13` oder `vaxneuvance` → Dosis + 1 Jahr (für die Standardgruppe offen, siehe Tabelle). Bei `doctor_recommends` gilt dann dieses Datum statt `null`, mit `startStatus`.
- `zoster` (`A = 60`, Indikation ab 18): Dosen = `dosesOf(vs, 'zoster', { exclude: ['zostavax'] })`. Ab 2 Dosen `protected`/`complete`. Eine Dosis: 2. Dosis 2–6 Monate danach (`nextInSeries`, auch wenn nicht mehr angezeigt), `reason: series`. Keine Dosis: Muster oben, `dose: { number: 1, of: 2 }`.
- `rsv` (`A = 75`, Indikation 60–74): ab einer Dosis `protected`/`complete`. Sonst Muster oben; Karte nur zwischen 60. und 75. Geburtstag. `timing: 'normal'` (der Saison-Termin für die Erinnerung ist Sache von Plan 4).

- [ ] **Step 1: Failing tests schreiben** (Auswahl)

```ts
it('Gürtelrose: Tag vor und am 60. Geburtstag (Epid Bull 4/2026, S. 13)', () => {
  const p = person('1967-03-01')
  expect(run(zosterRule, { person: p, today: '2027-02-28' })).toMatchObject({ status: 'soon', dueDate: '2027-03-01' })
  expect(run(zosterRule, { person: p, today: '2027-03-01' })).toMatchObject({ status: 'due', dose: { number: 1, of: 2 } })
})
it('RSV: wer am 29. Februar geboren ist, wird im Nicht-Schaltjahr am 28. Februar 75 (Epid Bull 4/2026, S. 18)', () => {
  expect(run(rsvRule, { person: person('1952-02-29'), today: '2027-02-28' })).toMatchObject({ status: 'due', dueDate: '2027-02-28' })
})
it('Gürtelrose: 2. Dosis frühestens 2, spätestens 6 Monate nach der ersten (Epid Bull 4/2026, S. 68)', () => { /* Grenzen */ })
it('Gürtelrose: Zostavax zählt nicht (Epid Bull 4/2026, S. 25)', () => { /* … */ })
it('Gürtelrose: Karte bei chronischer Erkrankung ab 18, Arzt empfiehlt → fällig (Epid Bull 45/2025, S. 4)', () => { /* 45-Jährige: discuss; doctor_recommends → due, reason doctor; doctor_not_applicable → future */ })
it('Pneumokokken: ab 60 einmalig PCV20, danach keine Wiederholung (Epid Bull 4/2026, S. 17)', () => { /* … */ })
it('Pneumokokken: frühestens 6 Jahre nach PPSV23 (Epid Bull 4/2026, S. 17)', () => { /* … */ })
it('Pneumokokken: Eintrag ohne Impfstoff zählt wie PPSV23 (Epid Bull 4/2026, S. 17)', () => { /* … */ })
it('RSV: einmalig ab 75 (Epid Bull 4/2026, S. 18)', () => { /* … */ })
it('RSV: Karte nur zwischen 60 und 74 (Epid Bull 4/2026, S. 18)', () => { /* 59 mit Schalter → future ohne Karte */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren und eintragen.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(rules): add pneumococcal, shingles and RSV`

### Task 8: FSME und fertiges Regelwerk

**Files:**
- Create: `src/core/rules/recommendations/tbe.ts`, `src/core/rules/questions.ts` mit Tests
- Modify: `src/core/rules/rulebook.ts`
- Test: `src/core/rules/rulebook.test.ts`

**Interfaces:**
- Consumes: Task 3 bis 7.
- Produces: `tbeRule`; `export function needsTbeQuestion(person: Person, vaccinations: Vaccination[], decisions: Decision[]): boolean`; `RULEBOOK` mit allen zwölf Regeln, `version`, `edition`, `sources`.

Ablauf `tbe` (Werte siehe Regeltabelle): nur bei `answers.fsme === 'yes'`, sonst `not_applicable`. Den Impfstoff bestimmt die letzte Dosis: `encepur` → Encepur-Werte, alles andere (auch ohne Impfstoff) → FSME-IMMUN-Werte. 0 bis 2 Dosen: `nextInSeries` mit den Abständen des Impfstoffs, Gesamtzahl 3. 3 Dosen: erste Auffrischung 3 Jahre nach Dosis 3. Ab 4 Dosen: FSME-IMMUN 5 Jahre, bei 60 Jahren oder älter am Tag der letzten Dosis 3 Jahre; Encepur 5 Jahre (untere Grenze von 5–10), ab 50 Jahren am Tag der letzten Dosis 3 Jahre. Auffrischungen mit `boosterStatus`, `reason: booster`; Grundimmunisierung mit `reason: indication/tbe`.

`needsTbeQuestion`: `answers.fsme !== 'yes'`, mindestens eine FSME-Dosis und keine Entscheidung zu `tbe` (Spec 7.2: einmal nachfragen).

`RULEBOOK`:
- `version`: Datum der Umsetzung mit `.1`, etwa `'2026-12-01.1'`.
- `edition`: `'Epid. Bull. 4/2026, geprüft bis Epid. Bull. 48/2026'`.
- `sources`: Epid. Bull. 4/2026, 28/2026, 45/2025, Fachinformationen FSME-IMMUN Erwachsene und Encepur Erwachsene, jeweils mit URL aus der Regeltabelle.
- `changes: []` (die erste Version bringt keine Hinweise, weil es noch keinen gesehenen Stand gibt).

- [ ] **Step 1: Failing tests schreiben**

```ts
it('FSME: ohne „Ja“ keine Empfehlung (Epid Bull 4/2026, S. 11)', () => { /* fsme 'open' → not_applicable */ })
it('FSME-IMMUN: 2. Dosis 1–3 Monate, 3. Dosis 5–12 Monate danach (FI FSME-IMMUN, 4.2)', () => { /* Grenzen */ })
it('Encepur: 2. Dosis 14 Tage bis 3 Monate, 3. Dosis 9–12 Monate danach (FI Encepur, 4.2)', () => { /* … */ })
it('FSME: erste Auffrischung 3 Jahre nach der 3. Dosis (FI FSME-IMMUN, 4.2)', () => { /* … */ })
it('FSME-IMMUN: danach alle 5 Jahre, ab 60 alle 3 Jahre (FI FSME-IMMUN, 4.2)', () => { /* letzte Dosis mit 59 → 5 Jahre, mit 60 → 3 Jahre */ })
it('Encepur: danach alle 5 Jahre, ab 50 alle 3 Jahre (FI Encepur, 4.2)', () => { /* 49 → 5, 50 → 3 */ })
it('Nachfrage, wenn FSME-Impfungen eingetragen sind und die Frage nicht mit Ja beantwortet ist', () => { /* needsTbeQuestion true; nach Entscheidung declined false; bei fsme 'yes' false */ })
// rulebook.test.ts
it('jede Empfehlungs-ID kommt genau einmal vor, jede Regel hat eine Fundstelle mit URL', () => { /* … */ })
it('Version hat die Form YYYY-MM-DD.N', () => { /* … */ })
it('eine Beispielperson ergibt eine plausible Gesamtauswertung', () => {
  // person('1960-05-10', { fsme: 'yes' }), Impfungen: 3× Td (letzte 2014-03-01), MMR nicht (vor 1971), Shingrix 2026-10-01, today '2026-11-27'
  // td overdue, pertussis due (with_td), zoster soon (2. Dosis), influenza due (season), covid19 future (75), rsv future, mmr not_applicable, tbe due
})
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren, alle Regeln in `RULEBOOK.rules` in Tabellenreihenfolge.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(rules): add TBE and complete the rulebook`

### Task 9: „Neu“-Erkennung

**Files:**
- Create: `src/core/rules/ruleState.ts`
- Modify: `src/core/model.ts`, `src/core/storage/db.ts` (Typ `RuleState` aus `model.ts` statt des losen Platzhalters), `src/core/formats/schemas.ts` (`ruleStateSchema`)
- Test: `src/core/rules/ruleState.test.ts`

**Interfaces:**
- Consumes: `Recommendation`, `Rulebook`, `compareVersions` (Task 3).
- Produces:
```ts
// model.ts
export interface SnapshotEntry { id: string; dueDate: ISODate | null; dose: number | null; season: boolean }
export interface Notice {
  kind: 'new' | 'changed' | 'dropped'
  recommendationId: string
  text: string | null          // Text aus der Änderungsliste, null wenn es keinen passenden Eintrag gibt
  validSince: ISODate | null
}
export interface RuleState { personId: string; seenVersion: string; snapshot: SnapshotEntry[]; notices: Notice[] }
// ruleState.ts
export function snapshotOf(recs: Recommendation[]): SnapshotEntry[]
export function compareSnapshots(before: SnapshotEntry[], after: SnapshotEntry[]): { kind: Notice['kind']; id: string }[]
export function nextRuleState(prev: RuleState | null, personId: string, recs: Recommendation[], rulebook: Rulebook): RuleState
```

Regeln (Spec 7.4):
- Im Schnappschuss stehen nur zutreffende Empfehlungen: Status nicht `not_applicable`, `declined` oder `not_needed`. `discuss` zählt als zutreffend. Sortiert nach `id`, `dose` ist `rec.dose?.number ?? null`, `season` ist `rec.timing === 'season'`.
- Verglichen werden Vorhandensein, `dueDate` und `dose`, nicht der Status. Bei `season: true` zählt nur das Vorhandensein.
- `nextRuleState`:
  - `prev` ist `null` (erster Start, nach einer Wiederherstellung, unlesbarer Stand): neuer Stand mit `seenVersion = rulebook.version`, Schnappschuss, keine Hinweise.
  - Regelwerk nicht neuer als `prev.seenVersion`: nur den Schnappschuss erneuern, Hinweise bleiben, `seenVersion` bleibt die größere der beiden.
  - Regelwerk neuer: Schnappschüsse vergleichen und je Unterschied einen Hinweis anhängen. `text` und `validSince` kommen aus dem jüngsten Eintrag der Änderungsliste mit `compareVersions(change.version, prev.seenVersion) > 0`, dessen `ids` die Empfehlung enthält. Ein älterer Hinweis zur selben Empfehlung wird ersetzt. Danach `seenVersion = rulebook.version`.
- *(Festlegung Claude)* Abweichend vom Wortlaut der Spec („nach dem Bestätigen speichert die App Version und Schnappschuss neu“) speichert die App beides sofort und behält die Hinweise, bis der Anwender sie bestätigt. Sonst würde eine eigene Änderung vor dem Bestätigen den Schnappschuss mit dem neuen Regelwerk überschreiben und den Unterschied löschen. Für den Anwender sieht beides gleich aus.

- [ ] **Step 1: Failing tests schreiben** (mit zwei kleinen Test-Regelwerken `v1` und `v2` aus festen Test-Regeln, nicht dem echten Regelwerk)

```ts
it('erste Auswertung legt den Stand ohne Hinweise an', () => {
  const s = nextRuleState(null, 'p1', recsV1, v1)
  expect(s).toMatchObject({ seenVersion: '2026-12-01.1', notices: [] })
  expect(s.snapshot.map(e => e.id)).toEqual(['a', 'b'])
})
it('neu zutreffend ergibt „Neu“ mit Text und Datum aus der Änderungsliste', () => {
  // v2 bringt Empfehlung 'c' dazu, Änderungseintrag { version: '2027-01-15.1', ids: ['c'], validSince: '2027-01-15', text: 'Die STIKO empfiehlt …' }
  const s = nextRuleState(stateV1, 'p1', recsV2, v2)
  expect(s.notices).toEqual([{ kind: 'new', recommendationId: 'c', text: 'Die STIKO empfiehlt …', validSince: '2027-01-15' }])
  expect(s.seenVersion).toBe('2027-01-15.1')
})
it('anderes Fälligkeitsdatum oder andere Dosis ergibt „Geändert“', () => { /* 'a' mit neuem dueDate → kind 'changed' */ })
it('weggefallene Empfehlung ergibt „Entfällt“', () => { /* 'b' fehlt in v2 → kind 'dropped' */ })
it('ohne Eintrag in der Änderungsliste ist der Text null', () => { /* … */ })
it('Saison-Impfung: neues Datum ist keine Änderung', () => { /* season: true, anderes dueDate → keine Hinweise */ })
it('Älterwerden ist kein „Neu“: anderer Status bei gleicher Version', () => { /* future → due, gleiche Version → keine Hinweise */ })
it('abgelehnte Empfehlungen stehen nicht im Schnappschuss', () => { /* status 'declined' → fehlt */ })
it('gleiche Version: Schnappschuss neu, alte Hinweise bleiben', () => { /* … */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. `ruleStateSchema` in `schemas.ts` beschreibt `RuleState` vollständig, damit Task 10 gespeicherte Stände prüfen kann.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(core): detect new, changed and dropped recommendations`

### Task 10: Speicher und Datenanbindung

**Files:**
- Modify: `src/core/storage/repository.ts`, `src/app/data/AppData.tsx`, `src/test/helpers.tsx`
- Test: `src/core/storage/repository.test.ts`, `src/app/data/AppData.test.tsx` (neu)

**Interfaces:**
- Consumes: `evaluate`, `RULEBOOK` (Task 3 bis 8), `nextRuleState`, `RuleState`, `ruleStateSchema` (Task 9).
- Produces:
```ts
// Repository (zusätzlich)
getDecisions(personId: string): Promise<Decision[]>
saveDecision(d: Decision): Promise<void>
deleteDecision(personId: string, recommendationId: string): Promise<void>
getRuleState(personId: string): Promise<RuleState | null>   // prüft mit ruleStateSchema; ungültig → null
saveRuleState(s: RuleState): Promise<void>
// AppData (zusätzlich)
decisions: Decision[]
recommendations: Recommendation[]   // evaluate(person, vaccinations, decisions, today, rulebook, settings); ohne Person []
ruleState: RuleState | null
today: ISODate
actions.createPerson(input: { name: string; birthDate: ISODate; answers?: PersonAnswers }): Promise<void> // ohne answers: DEFAULT_ANSWERS
actions.saveDecision(input: { recommendationId: string; kind: Decision['kind']; reason?: string }): Promise<void> // personId und at setzt der Provider
actions.deleteDecision(recommendationId: string): Promise<void>
actions.dismissNotices(): Promise<void>
// AppDataProvider-Props (für Tests): rulebook?: Rulebook (Standard RULEBOOK), today?: ISODate (Standard todayISO())
// helpers.tsx: seed({ …, decisions?: Decision[], ruleStates?: RuleState[] }); renderWithData(ui, route, { rulebook?, today? })
```

Ablauf: Nach dem Laden und nach jeder Änderung an Person, Impfungen oder Entscheidungen berechnet der Provider `nextRuleState(ruleState, person.id, recommendations, rulebook)` und speichert nur, wenn sich der Stand inhaltlich unterscheidet (Vergleich per `JSON.stringify`). `restore` liest danach den Regel-Stand neu; `replaceAll` hat ihn geleert, also entsteht er ohne Hinweise neu *(Festlegung Claude: Der Regel-Stand gehört nicht in die Sicherung)*. `dismissNotices` speichert den Stand mit leerer Hinweisliste.

- [ ] **Step 1: Failing tests schreiben**

```ts
// repository.test.ts
it('speichert, liest und löscht Entscheidungen je Person', async () => { /* zwei Personen, getDecisions(p1) nur die von p1; deleteDecision */ })
it('Regel-Stand: Hin- und Rückweg', async () => { /* saveRuleState → getRuleState deep-equal */ })
it('unlesbarer Regel-Stand ergibt null', async () => { /* direkt { personId: 'p1', foo: 1 } in den Store schreiben → null */ })
```

```tsx
// AppData.test.tsx (mit Test-Regelwerk und festem today)
it('beim ersten Laden entsteht ein Regel-Stand ohne Hinweise', async () => { /* data().ruleState.notices === [] und gespeichert */ })
it('ein neueres Regelwerk ergibt Hinweise, dismissNotices leert sie', async () => {
  // seed ruleStates mit seenVersion v1 und Schnappschuss von v1, render mit v2 → notices.length > 0
  // dismissNotices → notices leer, auch nach neuem Laden
})
it('eine Entscheidung ändert die Empfehlung sofort und bleibt gespeichert', async () => { /* saveDecision declined → status 'declined'; neu laden → noch declined */ })
it('nach einer neuen Impfung ist der Schnappschuss erneuert', async () => { /* saveVaccination → ruleState.snapshot ändert sich, keine Hinweise */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. `getDecisions` liest alle Einträge und filtert nach `personId` (wenige Einträge, kein Index nötig).
- [ ] **Step 4:** Tests → PASS, auch die bestehenden.
- [ ] **Step 5: Commit** `feat(app): load decisions and rule state, compute recommendations`

### Task 11: Angaben zur Person, Vorlauf und Saison-Tag

**Files:**
- Create: `src/app/answers/AnswersFields.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/checkbox.tsx` (`npx shadcn@latest add switch checkbox`, danach Import von `cn` und Größen wie in `CLAUDE.md` beschrieben prüfen)
- Modify: `src/app/setup/SetupScreen.tsx`, `src/app/settings/SettingsScreen.tsx`, `src/texts.ts`
- Test: `src/app/answers/AnswersFields.test.tsx`, `src/app/App.test.tsx`, `src/app/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `actions.createPerson` mit `answers`, `actions.updatePerson`, `actions.saveSettings` (Task 10).
- Produces: `export function AnswersFields(props: { idPrefix: string; value: PersonAnswers; onChange(a: PersonAnswers): void }): JSX.Element`

Texte (in `T.answers` und `T.settings`; wörtlich aus der Spec, wo sie sie vorgibt):
- Überschrift „Angaben für Empfehlungen“, darunter: „Manche Impfungen empfiehlt die STIKO nur bestimmten Menschen. Diese Angaben bleiben auf diesem Gerät, du kannst sie später in den Einstellungen ändern.“
- Schalter „Ich habe eine chronische Erkrankung“, Erklärung: „Bei manchen Impfungen empfiehlt die STIKO Menschen mit bestimmten Grunderkrankungen, früher zu impfen. Ob das für dich gilt, entscheidet deine Ärztin oder dein Arzt. ImpfPass zeigt dir dafür Karten „Mit dem Arzt besprechen“.“
- FSME (Spec 7.2): „Hältst du dich in FSME-Risikogebieten im Freien auf, zu Hause oder im Urlaub (Garten, Wald, Wandern)?“ mit drei Knöpfen „Ja“, „Nein“, „Weiß ich nicht“ (`ToggleGroup`, Werte `yes`, `no`, `open`). Erklärung: „FSME wird durch Zecken übertragen. Welche Landkreise als Risikogebiet gelten, zeigt die Karte des Robert Koch-Instituts.“ Link „Karte der FSME-Risikogebiete (RKI)“ auf `https://www.rki.de/DE/Themen/Infektionskrankheiten/Infektionskrankheiten-A-Z/F/FSME/Karte.html` (geprüft am 27.11.2026, Stand Epid. Bull. 9/2026), `target="_blank"`, `rel="noopener noreferrer"`.
- Beruf und Tierkontakt, vier Kästchen (Spec 7.2): „Ich arbeite mit Patienten oder Pflegebedürftigen.“, „Ich arbeite in einer Kita, Schule oder anderen Gemeinschaftseinrichtung.“, „Ich habe Kontakt mit Blut oder anderen Körperflüssigkeiten, auch im Rettungsdienst oder bei der Polizei.“, „Ich habe regelmäßig direkten Kontakt zu Geflügel, Schweinen, Wildvögeln oder ähnlichen Tieren, beruflich oder privat.“ Ist eines angekreuzt: „Für Impfungen wegen des Berufs ist meist die Betriebsärztin oder der Betriebsarzt zuständig, die Kosten trägt der Arbeitgeber.“
- Einstellungen, Abschnitt „Erinnerungen“: „Vorlauf“ als `<select>` mit 1, 2, 3, 4, 6, 9, 12 Monaten („1 Monat“, „2 Monate“ …), Erklärung „So viele Monate vor der Fälligkeit wird eine Impfung in der Übersicht gelb. Dann ist Zeit, einen Termin auszumachen.“ „Saison-Tag“ als `<select>` mit „1. August“ (`08-01`), „15. August“, „1. September“, „15. September“, „1. Oktober“, Erklärung „Ab diesem Tag werden die jährlichen Impfungen im Herbst gelb, etwa gegen Grippe.“ Beide speichern sofort beim Ändern.

- [ ] **Step 1: Failing tests schreiben**

```tsx
// AnswersFields.test.tsx
it('FSME hat drei Antworten und den Link zur RKI-Karte', async () => {
  // Knöpfe „Ja“, „Nein“, „Weiß ich nicht“; Link-href wie oben; Klick „Ja“ → onChange mit fsme 'yes'
})
it('der Hinweis zum Betriebsarzt erscheint, sobald eine Tätigkeit angekreuzt ist', async () => { /* … */ })
// App.test.tsx
it('Ersteinrichtung in zwei Schritten speichert die Angaben', async () => {
  // Name, Geburtsdatum → „Weiter“ → Überschrift „Angaben für Empfehlungen“
  // Schalter chronische Erkrankung an, FSME „Ja“ → „Weiter“ → Übersicht; data().person.answers.chronicIllness === true, fsme === 'yes'
})
it('„Zurück“ im zweiten Schritt behält Name und Geburtsdatum', async () => { /* … */ })
// SettingsScreen.test.tsx
it('Vorlauf und Saison-Tag werden sofort gespeichert', async () => { /* Vorlauf 3 → settings.leadMonths 3; Saison-Tag „1. Oktober“ → '10-01' */ })
it('geänderte Angaben werden mit „Angaben speichern“ gespeichert', async () => { /* … */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren. `SetupScreen` bekommt zwei Schritte im eigenen Zustand. Schritt 1 prüft Name und Geburtsdatum wie bisher, ruft aber noch nicht `createPerson` auf. Schritt 2 zeigt `AnswersFields` mit `DEFAULT_ANSWERS`; „Weiter“ ruft `createPerson({ name, birthDate, answers })`. In den Einstellungen steht der Abschnitt „Angaben für Empfehlungen“ zwischen Profil und Erinnerungen, mit Knopf „Angaben speichern“ (`updatePerson`).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): ask person details for recommendations, lead time and season day`

### Task 12: Übersicht mit Ampel

**Files:**
- Create: `src/app/overview/lights.ts`, `src/app/overview/statusText.ts`, `src/app/overview/RecommendationRow.tsx`, `src/app/overview/DiscussCard.tsx`, `src/app/overview/NoticeBanner.tsx`, `src/app/overview/TbeQuestion.tsx`
- Modify: `src/app/overview/OverviewScreen.tsx`, `src/app/overview/lastByDisease.ts`, `src/app/settings/InfoScreen.tsx`, `src/texts.ts`
- Test: `src/app/overview/lights.test.ts`, `src/app/overview/statusText.test.ts`, `src/app/overview/OverviewScreen.test.tsx`, `src/app/settings/InfoScreen.test.tsx` (neu)

**Interfaces:**
- Consumes: `useAppData` mit `recommendations`, `ruleState`, `today`, `actions.saveDecision`, `actions.dismissNotices`, `actions.updatePerson` (Task 10); `needsTbeQuestion` (Task 8); `RULEBOOK`.
- Produces:
```ts
export type Light = 'red' | 'yellow' | 'green' | 'grey'
export function lightOf(r: Recommendation): Light | null
export interface OverviewGroups {
  red: Recommendation[]; yellow: Recommendation[]; green: Recommendation[]; grey: Recommendation[]
  discuss: Recommendation[]; hidden: Recommendation[]               // hidden: declined, not_needed
  others: { disease: DiseaseId; last: Vaccination }[]               // Krankheiten mit Einträgen ohne zutreffende Empfehlung
}
export function groupForOverview(recs: Recommendation[], vaccinations: Vaccination[]): OverviewGroups
export function statusText(r: Recommendation, precision?: 'month' | 'day'): string   // Übersicht 'month' (Standard), Detail 'day'
```

Namen der Empfehlungen (`T.rec.names`, ein `Record<string, string>`, damit auch Namen weggefallener Empfehlungen bleiben können): `td` „Tetanus und Diphtherie“, `pertussis` „Keuchhusten“, `polio` „Kinderlähmung (Polio)“, `mmr` „Masern, Mumps, Röteln“, `varicella` „Windpocken“, `hepatitis_b` „Hepatitis B“, `influenza` „Grippe“, `covid19` „COVID-19“, `pneumococcal` „Pneumokokken“, `zoster` „Gürtelrose“, `rsv` „RSV“, `tbe` „FSME“.

`lightOf`: `overdue` und `due` → `red`, bei `timing === 'season'` aber `yellow`; `soon` → `yellow`; `protected` → `green`; `future` → `grey`; alle anderen → `null`. Gruppen sind alphabetisch nach `T.rec.names[id]` (`localeCompare` mit `'de'`). `others` nutzt `lastByDisease` für die Krankheiten mit Einträgen, die keine angezeigte Empfehlung abdeckt (angezeigt: Ampelfarbe, `discuss`, `declined` oder `not_needed`). So erscheinen etwa Masern-Impfungen von vor 1971 Geborenen und Reiseimpfungen dort.

Darstellung von oben nach unten:
1. Hinweise aus `ruleState.notices` (`NoticeBanner`): „Neu: {text} Betrifft dich.“, „Geändert: {text}“, „Entfällt: {text}“; ist `text` null, steht dort der Name der Empfehlung. Je Hinweis ein Link „Ansehen“ zur Detailansicht (nicht bei „Entfällt“), darunter ein Knopf „Verstanden“ für alle (`dismissNotices`).
2. FSME-Nachfrage, wenn `needsTbeQuestion` wahr ist (Spec 7.2): „Du hast FSME-Impfungen eingetragen. Soll ImpfPass an die Auffrischungen erinnern?“ Knöpfe „Ja, erinnern“ (setzt `answers.fsme = 'yes'`) und „Nein“ (Entscheidung `declined` für `tbe`).
3. Karten „Mit dem Arzt besprechen“ (`DiscussCard`, Status `discuss`): Name, „Für alle empfohlen ab {normalAge} Jahren.“ oder „Ohne besonderen Grund nicht empfohlen.“, dann „Die STIKO empfiehlt sie früher oder zusätzlich für: {discussTargetGroup}“ (bei `topic: 'serology'`: „Ob du geschützt bist, kann ein Bluttest klären.“ davor). Knöpfe „Arzt empfiehlt sie mir“ (`doctor_recommends`) und „Trifft nicht zu“ (`doctor_not_applicable`). „Noch offen“ ist der Zustand ohne Entscheidung und steht als Auswahl in der Detailansicht (Task 13).
4. Ampelgruppen mit Überschrift: „Jetzt fällig“ (rot), „Bald fällig“ (gelb), „Geschützt“ (grün), „Später“ (grau). Jede Zeile (`RecommendationRow`) ist ein Link auf `/empfehlungen/{id}` mit Name, `statusText` und bei Gelb außer Saison eine zweite Zeile „Termin ausmachen“. Linker Rand 4 px und Symbol in der Ampelfarbe: `CircleAlert` mit `border-l-red-600 text-red-600`, `Clock` mit `yellow-500`, `CircleCheck` mit `green-600`, `CircleDashed` mit `muted-foreground`; im dunklen Design `red-400`, `yellow-400`, `green-400`. Die Zeile trägt `data-light="red"` usw. für Tests. Das Symbol ist `aria-hidden`, die Gruppenüberschrift und der Text tragen die Bedeutung.
5. „Weitere Impfungen“: je Krankheit „zuletzt geimpft …“ wie bisher, Link zur Impfung.
6. „Ausgeblendet“: Name und „Möchte ich nicht“ bzw. „Nicht nötig: {Grund}“, Link zur Detailansicht.
7. Fuß: „STIKO-Stand: {RULEBOOK.edition}, Regeln vom {Datum aus RULEBOOK.version}“ und „ImpfPass ersetzt keine ärztliche Beratung.“

Ohne eingetragene Impfungen steht oben: „Du hast noch keine Impfungen eingetragen. Bis dahin steht hier fast alles unter „Jetzt fällig“.“ mit dem Knopf „Impfung eintragen“. Unter 18 Jahren (keine Empfehlungen) steht dort stattdessen: „ImpfPass berechnet Empfehlungen ab 18 Jahren.“, darunter die Einträge wie unter „Weitere Impfungen“. Der Satz „Empfehlungen und Erinnerungen folgen in einer späteren Version.“ entfällt samt Text in `T`.

`statusText` (Daten über `formatDate(d, precision)`, in der Übersicht also „03/2027“):

| Status, Art | Text |
| --- | --- |
| `overdue`, `normal` | „überfällig seit {dueDate}“ |
| `due`, `normal` | „jetzt fällig“ |
| `due`/`overdue`, `follow_up` | „{n}. Dosis fällig“, mit `latestDate` dahinter „, spätestens {latestDate}“ |
| `due`, `season` | „für die Saison {label} noch offen“ |
| `soon`, `normal` | „fällig ab {dueDate}“ |
| `soon`, `follow_up` | „{n}. Dosis ab {dueDate}“ |
| `soon`, `season` | „für die Saison {label} ab {dueDate}“ |
| `protected`, `season` | „für die Saison {label} geimpft“ |
| `protected` mit `dueDate` | „geschützt bis {dueDate}“ |
| `protected` ohne `dueDate` | „geschützt, keine Auffrischung nötig“ |
| `future`, `season` | „nächste Saison ab {dueDate}“ |
| `future`, Begründung `age` | „ab {age} Jahren, also ab {dueDate}“ |
| `future`, sonst | „ab {dueDate}“ |

Die Info-Seite nennt zusätzlich den STIKO-Stand, die Regelwerk-Version und die Quellen aus `RULEBOOK.sources` als Links sowie den Satz „Die Regeln sind selbst aus den Empfehlungen der STIKO abgeleitet. Bei Fragen zu deiner Impfung entscheidet deine Ärztin oder dein Arzt.“

- [ ] **Step 1: Failing tests schreiben**

```ts
// lights.test.ts
it.each([
  ['overdue', 'normal', 'red'], ['due', 'normal', 'red'], ['due', 'follow_up', 'red'],
  ['due', 'season', 'yellow'], ['soon', 'normal', 'yellow'], ['protected', 'normal', 'green'],
  ['future', 'normal', 'grey'], ['discuss', 'normal', null], ['declined', 'normal', null],
  ['not_needed', 'normal', null], ['not_applicable', 'normal', null],
])('%s/%s → %s', (status, timing, light) => { /* … */ })
it('Gruppen sind alphabetisch, Reiseimpfungen landen unter „Weitere Impfungen“', () => { /* Gelbfieber-Eintrag → others */ })
// statusText.test.ts: je Tabellenzeile oben ein Fall
```

```tsx
// OverviewScreen.test.tsx (echtes Regelwerk, festes today '2026-11-27')
it('ordnet nach Dringlichkeit und färbt die Zeilen', async () => {
  // Person geboren 1960-05-10, Td 1980, 1981 und 2014-03-01 (Auffrischung überfällig), Gelbfieber 2015
  // Überschriften in der Reihenfolge „Jetzt fällig“, …; Zeile „Tetanus und Diphtherie“ mit data-light="red" und „überfällig seit 03/2024“
  // „Weitere Impfungen“ enthält Gelbfieber; Fuß nennt den STIKO-Stand
})
it('Karte „Mit dem Arzt besprechen“: „Arzt empfiehlt sie mir“ macht daraus eine rote Zeile', async () => { /* chronicIllness true, 50 Jahre */ })
it('Hinweise erscheinen und verschwinden mit „Verstanden“', async () => { /* seed ruleState mit notices */ })
it('FSME-Nachfrage: „Nein“ blendet FSME aus, „Ja, erinnern“ setzt die Antwort', async () => { /* … */ })
it('ohne Einträge erklärt ein Hinweis die vielen roten Zeilen', async () => { /* … */ })
it('unter 18 erscheint der Hinweis auf die Altersgrenze', async () => { /* Person geboren 2010-01-01 */ })
// InfoScreen.test.tsx
it('nennt STIKO-Stand, Regelwerk-Version und Quellen', async () => { /* … */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren wie oben beschrieben.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): show recommendations with traffic lights on the overview`

### Task 13: Empfehlung im Detail mit Entscheidungen

**Files:**
- Create: `src/app/recommendation/RecommendationDetail.tsx`
- Modify: `src/app/App.tsx` (Route `/empfehlungen/:id`), `src/texts.ts`
- Test: `src/app/recommendation/RecommendationDetail.test.tsx`

**Interfaces:**
- Consumes: `recommendations`, `decisions`, `vaccinations`, `actions.saveDecision`, `actions.deleteDecision` (Task 10); `statusText` (Task 12); `RULEBOOK.rules`, `RULEBOOK.changes`.

Inhalt (Spec 6.1 „Empfehlung im Detail“), Daten hier mit Tagesgenauigkeit:
- Zurück-Link „Übersicht“, Name als Überschrift, `statusText(r, 'day')`.
- „Warum“: Satz zur Begründung aus `T.rec.reason` (Tabelle unten).
- „Fundstelle“: „{edition} vom {date}, {section}, S. {page}“ als Link auf `source.url`; ohne Seitenzahl ohne „S. …“.
- „Gilt seit {Datum}“: `validSince` des jüngsten Eintrags der Änderungsliste für diese ID; ohne Eintrag entfällt die Zeile. Seit wann eine ältere Empfehlung gilt, steht nicht verlässlich in den Quellen, das Datum der Fundstelle zeigt den Stand.
- Ist der Schalter „chronische Erkrankung“ aus und hat die Regel `discussTargetGroup` mit `discussTopic === 'chronic'`, ein Satz: „Bei bestimmten Erkrankungen empfiehlt die STIKO diese Impfung früher.“ (Spec 7.2)
- Bei Status `discuss` oder einer Arzt-Entscheidung: Auswahl „Arzt empfiehlt sie mir“, „Trifft nicht zu“, „Noch offen“ (`ToggleGroup`; „Noch offen“ löscht die Entscheidung) mit dem Datum der Antwort („Geantwortet am …“).
- „Eingetragene Impfungen“: die Impfungen gegen die Krankheiten der Empfehlung, neueste zuerst, als Links.
- Knöpfe „Möchte ich nicht“ (`declined`, ohne Rückfrage, weil umkehrbar) und „Nicht nötig“. „Nicht nötig“ öffnet eine Auswahl: „Erkrankung durchgemacht“, „Immunität per Bluttest belegt“, „In einem anderen Impfpass belegt“, „Anderer Grund“ (mit Textfeld „Grund“), dann „Speichern“. Bei `declined` oder `not_needed` steht stattdessen der Grund und ein Knopf „Wieder anzeigen“ (`deleteDecision`).
- Unbekannte ID: „Diese Empfehlung gibt es nicht.“ mit Zurück-Link.

Begründungen (`T.rec.reason`):

| `reason.kind` | Text |
| --- | --- |
| `booster` | „Letzte Impfung am {lastDate}. Die nächste Auffrischung ist {intervalYears} Jahre danach vorgesehen.“ |
| `age` | „Die STIKO empfiehlt diese Impfung allen ab {age} Jahren.“ |
| `with_td` | „Die STIKO empfiehlt Erwachsenen, die nächste fällige Impfung gegen Tetanus und Diphtherie einmal mit Keuchhusten-Schutz zu bekommen.“ |
| `series` | „Eingetragen sind {given} von {total} Impfungen.“ |
| `catch_up` | „Eingetragen sind {given} von {total} Impfungen der Grundimmunisierung. Stehen frühere Impfungen in einem anderen Impfpass, wähle „Nicht nötig“.“ |
| `season` | „Jährliche Impfung, Saison {label}.“ |
| `indication`, `job` | „Empfohlen wegen deiner Tätigkeit.“ |
| `indication`, `tbe` | „Empfohlen, weil du dich in FSME-Risikogebieten aufhältst.“ |
| `indication`, `doctor` | „Deine Ärztin oder dein Arzt empfiehlt sie dir.“ |
| `complete` | „Die Impfungen sind vollständig, eine Auffrischung ist nicht vorgesehen.“ |
| `discuss` | wie die Karte in Task 12 |
| `none` | „Die STIKO empfiehlt diese Impfung für dich derzeit nicht.“ |

- [ ] **Step 1: Failing tests schreiben**

```tsx
it('zeigt Begründung, Fundstelle und „Gilt seit“', async () => { /* Td überfällig → Satz mit Datum und „alle 10 Jahre“; Link auf source.url */ })
it('„Möchte ich nicht“ blendet aus, „Wieder anzeigen“ holt zurück', async () => { /* Status declined, dann wieder overdue */ })
it('„Nicht nötig“ speichert den gewählten Grund', async () => { /* „Immunität per Bluttest belegt“ → decision.reason */ })
it('„Anderer Grund“ verlangt einen Text', async () => { /* leer → Fehlermeldung „Bitte gib einen Grund ein.“ */ })
it('Arzt-Antwort lässt sich auf „Noch offen“ zurücksetzen', async () => { /* doctor_recommends → Noch offen → Entscheidung gelöscht, Status discuss */ })
it('ohne Schalter nennt die Gürtelrose-Seite die frühere Empfehlung bei Erkrankungen', async () => { /* … */ })
it('unbekannte Empfehlung', async () => { /* /empfehlungen/xyz → „Diese Empfehlung gibt es nicht.“ */ })
```

- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(app): add recommendation detail with decisions`

### Task 14: STIKO-Wächter und Ablauf für Regel-Updates

**Files:**
- Create: `scripts/stiko-watch/watch.ts`, `scripts/stiko-watch/main.ts`, `scripts/stiko-watch/state.json`, `.github/workflows/stiko-watch.yml`
- Modify: `tsconfig.node.json` (`"scripts"` in `include`), `package.json` (Skripte), `CLAUDE.md`
- Test: `scripts/stiko-watch/watch.test.ts`

**Interfaces:**
- Produces:
```ts
// watch.ts (rein, ohne Netz und Dateisystem)
export interface WatchedPage { id: string; url: string; lineFilter?: RegExp; missingIsEmpty?: boolean }
export function watchedPages(year: number): WatchedPage[]
export interface PageText { id: string; url: string; hash: string; text: string }
export interface WatchState { pages: PageText[] }
export interface PageChange { id: string; url: string; added: string[]; removed: string[] }
export function extractMainText(html: string): string
export function hashText(text: string): string                  // SHA-256 hex über node:crypto
export function findChanges(state: WatchState, current: PageText[]): PageChange[]
export function combinedHash(current: PageText[]): string        // erste 12 Hex-Zeichen von SHA-256 über alle Seiten-Hashes
export function issueTitle(hash: string): string                 // `STIKO-Seiten geändert (${hash})`
export function issueBody(changes: PageChange[]): string
```
- Skripte in `package.json`: `"stiko:check": "node --experimental-strip-types scripts/stiko-watch/main.ts check"`, `"stiko:accept": "node --experimental-strip-types scripts/stiko-watch/main.ts accept"`.

Beobachtete Seiten (`watchedPages(year)`, alle am 27.11.2026 mit HTTP 200 und ohne JavaScript lesbar, Haupttext jeweils in `<main class="l-main">`):
- `stiko-empfehlungen`: `https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Staendige-Impfkommission/Empfehlungen-der-STIKO/Empfehlungen/empfehlungen-node.html`. Der „Stand“ dieser Seite wurde bei späteren Änderungen des PDFs nicht nachgeführt, der Link auf das PDF trägt aber einen Versionszähler (`04_26.pdf?__blob=publicationFile&v=12`). Deshalb behält `extractMainText` bei Links auf PDFs die Adresse.
- `stiko-begruendungen`: `https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Staendige-Impfkommission/Empfehlungen-der-STIKO/Begruendungen/begruendungen-node.html` (alle Beschlüsse nach Krankheit).
- `stiko-mitteilungen`: `https://www.rki.de/DE/Themen/Infektionskrankheiten/Impfen/Staendige-Impfkommission/Empfehlungen-der-STIKO/Mitteilungen/mitteilungen-node.html`
- `epid-bull-{year}`: `https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/{year}/EB-{year}-node.html` (Jahresarchiv), nur Zeilen mit „STIKO“ (`lineFilter: /STIKO/i`), damit nicht jede Wochenausgabe anschlägt. `missingIsEmpty: true`: Im Januar vor der ersten Ausgabe liefert die Seite 404 und zählt dann als leer. Die Übersichtsseite des Bulletins zeigt nur die aktuelle Ausgabe und taugt für einen monatlichen Abruf nicht.
- Die RSS-Feeds liegen unter `/SiteGlobals/`, das die `robots.txt` des RKI sperrt; der Wächter nutzt sie nicht. Er hält die dort genannte Pause (`Crawl-delay: 30`) zwischen zwei Abrufen ein.

Verhalten:
- `extractMainText` nimmt den Inhalt des ersten `<main>`-Elements (ohne `<main>` den von `<body>`), entfernt `script`, `style`, `nav`, `header`, `footer`, `form` und `noscript` samt Inhalt, macht aus `</p>`, `<br>`, `</li>`, `</h1>`–`</h6>`, `</tr>`, `</div>` Zeilenumbrüche, entfernt alle übrigen Tags, löst Entities auf (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&nbsp;`, numerische), entfernt weiche Trennstriche (`&shy;`, `&#173;` und U+00AD), fasst Leerraum je Zeile zusammen und lässt leere Zeilen weg. Ein Link, dessen `href` `.pdf` enthält, wird zu `Linktext (href)`, damit der Versionszähler im Text steht. So schlagen Änderungen an Klassen, Verschachtelung oder Navigation nicht an (Spec 7.5: keine Fehlalarme durch Layout-Änderungen). `main.ts` wendet danach den `lineFilter` der Seite an.
- `findChanges` vergleicht je Seite den Hash. Bei einem Unterschied sind `added` die Zeilen, die neu vorkommen, und `removed` die weggefallenen (Vergleich als Mengen, Reihenfolge wie im jeweiligen Text). Eine Seite, die im Stand fehlt, gilt mit allen Zeilen als hinzugekommen, mit leerem Text aber nicht als Änderung. Seiten im Stand, die nicht mehr beobachtet werden (Archiv des Vorjahres), werden übergangen.
- `issueBody`: je geänderter Seite die URL, höchstens 40 hinzugekommene und 40 entfernte Zeilen mit `+ ` bzw. `- ` in einem Codeblock, am Ende: „Ablauf: siehe Abschnitt „Regeln aktualisieren“ in `CLAUDE.md`.“
- `main.ts check`: lädt die Seiten aus `watchedPages(aktuelles Jahr)` nacheinander mit `fetch` (GET, Header `User-Agent: ImpfPass-STIKO-Waechter (+https://github.com/impfpass/impfpass.github.io)`, 30 Sekunden Pause zwischen zwei Abrufen). Eine Seite mit `missingIsEmpty` und Status 404 zählt als leerer Text. Antwortet eine andere Seite nicht mit 200, endet das Skript mit Code 1 und der URL in der Meldung; dann schlägt der Workflow fehl, und GitHub meldet das, ohne dass ein Issue entsteht. Ohne Änderung schreibt es `changed=false` nach `$GITHUB_OUTPUT`. Mit Änderung schreibt es `changed=true`, `title=…` und den Text nach `stiko-watch-issue.md`.
- `main.ts accept`: lädt alle Seiten und schreibt `scripts/stiko-watch/state.json` (`WatchState`, zwei Leerzeichen Einzug). Das macht der Betreuer, nachdem er die Regeln an eine Änderung angepasst hat.
- Workflow `.github/workflows/stiko-watch.yml` „STIKO-Wächter“: `schedule: cron "17 5 1 * *"` (monatlich am 1., 5:17 UTC) und `workflow_dispatch`; `permissions: contents: read, issues: write`; Schritte: `actions/checkout@v5`, `actions/setup-node@v5` (Node 22), `npm run stiko:check` mit `id: check`. Wenn `changed == 'true'`: `gh label create stiko-watch --force`, dann nur wenn `gh issue list --label stiko-watch --state all --search "<hash> in:title" --json number --jq length` 0 ergibt, `gh issue create --title "$TITLE" --body-file stiko-watch-issue.md --label stiko-watch`. So entsteht eine Meldung je Änderung, auch wenn der Betreuer das Issue schließt, ohne den Stand zu übernehmen (Spec 7.5).
- Optionaler Eintrag in der GTD-Inbox (Spec 7.5, Festlegung Claude): nur wenn die Secrets `GTD_INBOX_URL` (vollständige Adresse bis `/api/inbox`) und `GTD_INBOX_TOKEN` gesetzt sind und gerade ein Issue angelegt wurde, `curl -fsS -X POST "$GTD_INBOX_URL" -H "Authorization: Bearer $GTD_INBOX_TOKEN" -H "Content-Type: application/json" -d '{"content":"STIKO-Seiten geändert, ImpfPass-Regeln prüfen"}'`. Das Format `{"content": …}` stammt aus `docs/ios-shortcuts-guide.md` im GTD-Repo. Der Eintrag enthält keine persönlichen Daten.
- Der Wächter committet nichts. Den Vergleichsstand schreibt der Betreuer mit `npm run stiko:accept` fort (Spec 7.5 überlässt das dem Builder).

- [ ] **Step 1: Failing tests schreiben** (`// @vitest-environment node` am Dateianfang)

```ts
const page = (main: string) => `<html><body><header>Kopf</header><nav>Menü</nav><main>${main}</main><footer>Fuß</footer></body></html>`
it('nimmt nur den Haupttext, ohne Navigation, Skripte und weiche Trennstriche', () => {
  expect(extractMainText(page('<h1>STIKO-Emp&shy;fehlungen</h1><script>x()</script><p>Td alle 10&nbsp;Jahre &amp; mehr</p>')))
    .toBe('STIKO-Empfehlungen\nTd alle 10 Jahre & mehr')
})
it('andere Klassen und Verschachtelung ergeben denselben Text', () => {
  expect(extractMainText(page('<div class="a"><p>Satz</p></div>'))).toBe(extractMainText(page('<section><div class="b"><p>Satz</p></div></section>')))
})
it('Links auf PDFs behalten ihre Adresse samt Versionszähler', () => {
  expect(extractMainText(page('<p><a href="/a/04_26.pdf?__blob=publicationFile&amp;v=12">Empfehlungen 2026</a></p>')))
    .toBe('Empfehlungen 2026 (/a/04_26.pdf?__blob=publicationFile&v=12)')
})
it('das Jahresarchiv des Bulletins zählt nur Zeilen mit STIKO', () => { /* watchedPages(2026) enthält epid-bull-2026 mit lineFilter; Filter auf zwei Zeilen → eine */ })
it('unveränderte Seiten ergeben keine Änderung', () => { /* findChanges(state, gleiche Texte) → [] */ })
it('geänderter Absatz erscheint als hinzugekommen und entfernt', () => { /* added ['Neu'], removed ['Alt'] */ })
it('Seite ohne gespeicherten Stand gilt als hinzugekommen, leer aber nicht', () => { /* … */ })
it('nicht mehr beobachtete Seiten im Stand werden übergangen', () => { /* epid-bull-2025 im Stand, aktuell nur 2026 → keine Änderung dafür */ })
it('Titel enthält den kombinierten Hash', () => { expect(issueTitle('a1b2c3d4e5f6')).toBe('STIKO-Seiten geändert (a1b2c3d4e5f6)') })
it('Text des Issues kürzt auf 40 Zeilen je Richtung', () => { /* 50 neue Zeilen → 40 mit „+ “ */ })
```

- [ ] **Step 2:** `npm test -- scripts/stiko-watch` → FAIL.
- [ ] **Step 3:** `watch.ts` und `main.ts` implementieren, `"scripts"` in `tsconfig.node.json` aufnehmen.
- [ ] **Step 4:** Tests → PASS; `npm run lint && npm run typecheck` → grün.
- [ ] **Step 5:** `npm run stiko:accept` (braucht Netz) → `state.json` mit allen Seiten und nicht leerem Text. Danach `npm run stiko:check` → `changed=false` in der Ausgabe (ohne `GITHUB_OUTPUT` schreibt das Skript auf die Konsole).
- [ ] **Step 6:** `CLAUDE.md`, neuer Abschnitt „Regeln aktualisieren“ (Spec 7.5), Schritt für Schritt:
  1. Das Issue „STIKO-Seiten geändert (…)“ lesen und die genannten Stellen im Epidemiologischen Bulletin nachlesen.
  2. Fällt eine Regel weg, ändert sie sich oder kommt eine dazu: erst die Tests in `src/core/rules/recommendations/*.test.ts` für den neuen Stand schreiben, mit Fundstelle im Testnamen, und rot sehen.
  3. Regel und `source` anpassen. Empfehlungs-IDs nie umbenennen; eine weggefallene Empfehlung wird aus `RULEBOOK.rules` entfernt, ihr Name bleibt in `T.rec.names`.
  4. In `src/core/rules/rulebook.ts` `version` hochzählen (Datum des Updates und laufende Nummer, etwa `2027-02-03.1`), bei einer neuen Gesamtausgabe `edition` und `editionUrl` ändern, und einen Eintrag in `changes` anlegen (`ids`, `validSince` = Veröffentlichung im Epid. Bull., `text` für den Hinweis, ein Satz, der nach „Neu:“, „Geändert:“ oder „Entfällt:“ steht).
  5. `npm run stiko:accept`, damit der Wächter den neuen Stand kennt.
  6. Lint, Typprüfung, Tests, Build; Commit `feat(rules): …`; Push startet den Deploy; das Issue mit Verweis auf den Commit schließen.
  Ändert sich nur das Layout der RKI-Seite oder etwas ohne Bezug zu den Regeln: nur Schritt 5 und 6.
- [ ] **Step 7: Commit** `feat: add monthly STIKO watcher`

### Task 15: Gesamtprüfung und Veröffentlichung

- [ ] **Step 1:** `npm run lint && npm run typecheck && npm test && npm run build` → grün.
- [ ] **Step 2:** Prüfen: `grep -rn "app/texts" src` liefert nichts; jede Datei in `src/core/rules/recommendations/` exportiert eine Regel mit `source`; jeder Testname in `src/core/rules/recommendations/*.test.ts` enthält „Epid Bull“ oder „FI“ (Fachinformation), Prüfung mit `grep -L`.
- [ ] **Step 3:** `npm run preview`, im Browser mit einer Testperson (Ersteinrichtung, einige Impfungen) Übersicht im hellen und dunklen Design ansehen: alle vier Farben, Karte „Mit dem Arzt besprechen“, Detailansicht, keine CSP-Verstöße in der Konsole.
- [ ] **Step 4: Mit dem Nutzer abstimmen, dann veröffentlichen.** Erst nach seinem ausdrücklichen Ja `git push`, dann `gh run watch` → grün. Danach `gh workflow run stiko-watch.yml` und `gh run watch` → grün, kein neues Issue.
- [ ] **Step 5: Prüfung durch den Nutzer auf dem iPhone** (Spec 13): Angaben in den Einstellungen ändern, Farben in der Übersicht im hellen und dunklen Design, eine Karte „Mit dem Arzt besprechen“ beantworten, „Möchte ich nicht“ und „Wieder anzeigen“. Ergebnis in `docs/dev-log/` festhalten.
