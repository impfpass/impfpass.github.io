# Weitere Impfungen: Schutzdauer und angefangene Serien – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Angefangene Serien gegen Hepatitis A und B werden fällig wie andere Empfehlungen, vollständige stehen grün unter „Geschützt“, und Tollwut, Tuberkulose und Pocken bekommen unter „Weitere Impfungen“ einen Satz zur Schutzdauer.

**Architecture:** Eine neue Regel `hepatitis_a` und eine geänderte Regel `hepatitis_b` im Regelbaustein `src/core/rules/`, mit einer gemeinsamen Hilfe für das Schnellschema und zwei neuen `Reason`-Arten. Die Übersicht bekommt für Krankheiten ohne Empfehlung eine reine Funktion `otherHint`, die den Hinweissatz liefert. Regelwerk-Version und `changes` sorgen dafür, dass bestehende Nutzer einmal „Neu“ sehen.

**Tech Stack:** wie bisher (Vite, React 19, TypeScript, Tailwind 4, Vitest 4). Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-11-27-weitere-impfungen-design.md`, dazu Hauptentwurf `docs/superpowers/specs/2026-11-26-impfpass-design.md` Abschnitt 7.

## Global Constraints

- Erst beginnen, wenn Plan 3 abgeschlossen ist und `git status` in `C:\Dev\ImpfPass` sauber ist. Nur die in den Tasks genannten Dateien ändern, nur diese Dateien committen (`git add <pfad>`), nie `git add -A`.
- Nicht pushen. Der Push veröffentlicht über GitHub Actions und braucht das ausdrückliche Ja des Users.
- Regeln nur aus Primärquellen. Jede Regel nennt ihre Fundstelle (`SourceRef`), jeder Regeltest nennt sie im Testnamen. Seitenzahlen sind PDF-Seiten (wie in `eb4.ts`). In Epid Bull 27/2026 ist die PDF-Seite die gedruckte plus 10.
- PDFs zum Nachprüfen: `C:\Users\mail\AppData\Local\Temp\claude\865dc42078857924\9208473e-8745-45b1-a071-fbdda8f77ea6\scratchpad\pdfs\04_26.pdf` und `27_26.pdf` (falls gelöscht: die URLs in `eb4.ts` und Task 2).
- Empfehlungs-IDs nie umbenennen (`CLAUDE.md`). Neue ID: `hepatitis_a`.
- Alle sichtbaren Texte in `src/texts.ts`, deutsch, nach den Schreibregeln des Projekts (Skill `vermenschlichen`).
- Der Kern (`src/core/`) importiert nichts aus `src/app/`, `react` oder `react-dom`.
- TDD: erst der fehlschlagende Test, dann der Code.
- Vor jedem Commit grün: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Commit-Nachrichten `feat(rules): …` bzw. `feat(overview): …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Dieselbe Impfung zweimal am selben Tag eingetragen (Doppelerfassung): zählt als eine Dosis, weil `dosesOf` gleiche Tage zusammenfasst. Test in Task 2 (Havrix) und Task 3 (Tollwut).
2. Freie Eingabe ohne Impfstoff, nur mit Krankheiten: `["hepatitis_a"]` zählt als Einzelimpfstoff, `["hepatitis_a", "hepatitis_b"]` wie Twinrix. Test in Task 2.
3. Imvanex trägt `["mpox", "smallpox"]`: Der Pocken-Satz („zählt bei einer Mpox-Impfung mit“) darf dann nicht erscheinen, nur bei einer klassischen Pockenimpfung. Test in Task 3.
4. Gemischte Serie aus Einzelimpfstoff und Twinrix: vollständig erst bei 2 Dosen Einzelimpfstoff oder 3 insgesamt. Test in Task 2.
5. „Möchte ich nicht“ bei Hepatitis A: Die Empfehlung steht unter „Ausgeblendet“ und taucht nicht zusätzlich unter „Weitere Impfungen“ auf. Test in Task 3.

---

### Task 1: Schnellschema, `Reason` „started“ und Hepatitis B ohne Indikation

**Files:**
- Modify: `src/core/rules/types.ts` (Union `Reason`)
- Modify: `src/core/rules/helpers.ts`, Test: `src/core/rules/helpers.test.ts`
- Modify: `src/core/rules/recommendations/hepatitisB.ts`, Test: `src/core/rules/recommendations/hepatitisB.test.ts`
- Modify: `src/texts.ts` (`T.rec.detail.reason.started`)
- Modify: `src/app/recommendation/RecommendationDetail.tsx` (`ReasonSentence`), Test: `src/app/recommendation/RecommendationDetail.test.tsx`

**Interfaces:**
- Produces:
  - `Reason` um `{ kind: "started"; given: number; total: number }` erweitert.
  - `rapidFourthDose(doses: Vaccination[], today: ISODate, leadMonths: number): Pick<RuleResult, "status" | "dueDate" | "latestDate" | "dose" | "timing"> | null` in `helpers.ts`. Liefert bei genau 3 Dosen, deren dritte höchstens 2 Monate nach der ersten liegt (`doses[2].date <= addMonths(doses[0].date, 2)`), die 4. Dosis: `dueDate` = erste Dosis + 12 Monate, `latestDate: null`, `dose: { number: 4, of: 4 }`, `timing: "follow_up"`, `status` aus `nextDoseStatus(dueDate, null, today, leadMonths)`. Sonst `null`.
  - `T.rec.detail.reason.started(given: number, total: number): string`.

- [ ] **Step 1: Failing tests für `rapidFourthDose`** in `helpers.test.ts`:

```ts
it("Schnellschema: 3. Dosis höchstens 2 Monate nach der 1. ergibt 4. Dosis nach 12 Monaten (Epid Bull 27/2026, S. 62, Tab. 6)", () => {
  const twinrix = [shot("2026-01-01", "twinrix"), shot("2026-01-08", "twinrix"), shot("2026-01-22", "twinrix")];
  expect(rapidFourthDose(twinrix, "2026-11-27", 6)).toEqual({
    status: "soon", dueDate: "2027-01-01", latestDate: null, dose: { number: 4, of: 4 }, timing: "follow_up",
  });
  const engerix = [shot("2026-01-01", "engerix-b"), shot("2026-02-01", "engerix-b"), shot("2026-03-01", "engerix-b")];
  expect(rapidFourthDose(engerix, "2027-01-02", 6)?.status).toBe("due");
  const standard = [shot("2026-01-01", "twinrix"), shot("2026-02-01", "twinrix"), shot("2026-07-01", "twinrix")];
  expect(rapidFourthDose(standard, "2026-11-27", 6)).toBeNull();
  expect(rapidFourthDose(twinrix.slice(0, 2), "2026-11-27", 6)).toBeNull();
});
```

- [ ] **Step 2: Failing tests für Hepatitis B** in `hepatitisB.test.ts`. Die Fundstelle für das Fortsetzen ist Epid Bull 4/2026, S. 40, Kap. 4.5 Impfabstände („Jede Impfung zählt!“).

```ts
it("Hepatitis B: angefangene Serie ohne Beruf wird fortgesetzt (Epid Bull 4/2026, S. 40)", () => {
  const p = person("1985-05-05");
  expect(run(hepatitisBRule, { person: p, vaccinations: [shot("2026-10-27", "engerix-b")], today: "2026-11-27" }))
    .toMatchObject({ status: "due", dueDate: "2026-11-27", dose: { number: 2, of: 3 },
      reason: { kind: "started", given: 1, total: 3 }, source: { page: 40, section: "Kap. 4.5 Impfabstände" } });
  expect(run(hepatitisBRule, { person: p, vaccinations: [
    shot("2020-01-01", "engerix-b"), shot("2020-02-01", "engerix-b"), shot("2020-07-01", "engerix-b")],
    today: "2026-11-27" })).toMatchObject({ status: "protected", dueDate: null, reason: { kind: "complete" } });
});

it("Hepatitis B: angefangene Serie geht der Karte bei chronischer Erkrankung vor (Epid Bull 4/2026, S. 40)", () => {
  expect(run(hepatitisBRule, { person: person("1985-05-05", { chronicIllness: true }),
    vaccinations: [shot("2026-10-27", "engerix-b")], today: "2026-11-27" }))
    .toMatchObject({ status: "due", reason: { kind: "started" } });
});

it("Hepatitis B: Schnellschema braucht eine 4. Dosis nach 12 Monaten (Epid Bull 27/2026, S. 66, Tab. 7)", () => {
  const p = person("1985-05-05", { job: { bloodContact: true } });
  const rapid = [shot("2026-01-01", "engerix-b"), shot("2026-02-01", "engerix-b"), shot("2026-03-01", "engerix-b")];
  expect(run(hepatitisBRule, { person: p, vaccinations: rapid, today: "2026-11-27" }))
    .toMatchObject({ status: "soon", dueDate: "2027-01-01", dose: { number: 4, of: 4 },
      reason: { kind: "indication", indication: "job" } });
  expect(run(hepatitisBRule, { person: p, vaccinations: [...rapid, shot("2027-01-05", "engerix-b")], today: "2027-02-01" }).status)
    .toBe("protected");
});
```

Die bestehenden Tests bleiben unverändert grün, auch „ohne Beruf, Erkrankung und Arzt keine Empfehlung“ (ohne Dosis).

- [ ] **Step 3: Tests laufen lassen und rot sehen**

Run: `npx vitest run src/core/rules/helpers.test.ts src/core/rules/recommendations/hepatitisB.test.ts`
Expected: FAIL (`rapidFourthDose` fehlt, Status `not_applicable` statt `due`).

- [ ] **Step 4: Implementieren.** `rapidFourthDose` wie im Interfaces-Block. In `hepatitisBRule.evaluate`:
  - Dosen vor der Indikationsprüfung zählen.
  - Ohne Beruf und ohne Arzt-Empfehlung, aber mit mindestens einer Dosis: Serie fortsetzen mit `reason: { kind: "started", given, total }` und `source: eb4(40, "Kap. 4.5 Impfabstände")`. Das gilt auch bei chronischer Erkrankung. Ohne Dosis bleibt der bisherige Ablauf (Karte oder `not_applicable`).
  - Reihenfolge in allen Zweigen: ab 4 Dosen `protected`; bei 3 Dosen zuerst `rapidFourthDose`, sonst `protected` mit `reason: { kind: "complete" }`; darunter `nextInSeries` wie bisher. Bei der 4. Dosis behält die Begründung die Art des Zweigs (`indication` bzw. `started` mit `total: 4`).
  - `Reason` in `types.ts` erweitern. `ReasonSentence` bekommt `case "started"`. Text:

```ts
started: (given: number, total: number) =>
  `Eingetragen sind ${given} von ${vaccinationCount(total)}. Eine angefangene Serie wird zu Ende geführt, fehlende Impfungen werden nachgeholt, ohne neu anzufangen.`,
```

- [ ] **Step 5: Detail-Test** in `RecommendationDetail.test.tsx` (Muster wie der bestehende Hepatitis-B-Test mit `seed` und `open`): Person ohne Beruf, eine Engerix-B-Impfung, `open("hepatitis_b")` zeigt den Satz, der mit „Eingetragen sind 1 von 3“ beginnt und „ohne neu anzufangen“ enthält.

- [ ] **Step 6: Alle Tests, Lint, Typprüfung, Build grün**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: alles grün.

- [ ] **Step 7: Commit**

```bash
git add src/core/rules/types.ts src/core/rules/helpers.ts src/core/rules/helpers.test.ts src/core/rules/recommendations/hepatitisB.ts src/core/rules/recommendations/hepatitisB.test.ts src/texts.ts src/app/recommendation/RecommendationDetail.tsx src/app/recommendation/RecommendationDetail.test.tsx
git commit -m "feat(rules): continue started hepatitis B series, rapid schedule"
```

---

### Task 2: Regel Hepatitis A und Regelwerk

**Files:**
- Create: `src/core/rules/recommendations/eb27.ts`
- Create: `src/core/rules/recommendations/hepatitisA.ts`, Test: `src/core/rules/recommendations/hepatitisA.test.ts`
- Modify: `src/core/rules/types.ts` (`RecommendationId`, `Reason`)
- Modify: `src/core/rules/rulebook.ts`, Test: `src/core/rules/rulebook.test.ts`
- Modify: `src/texts.ts` (`T.rec.names.hepatitis_a`, `T.rec.status.protectedOpen`, `T.rec.detail.reason.longProtection`)
- Modify: `src/app/overview/statusText.ts`, Test: `src/app/overview/statusText.test.ts`
- Modify: `src/app/recommendation/RecommendationDetail.tsx`, Test: `src/app/recommendation/RecommendationDetail.test.tsx`

**Interfaces:**
- Consumes: `rapidFourthDose`, `Reason` „started“, `T.rec.detail.reason.started` (Task 1); `dosesOf`, `nextInSeries` aus `helpers.ts`; `eb4` aus `eb4.ts`.
- Produces:
  - `eb27(page: number, section: string): SourceRef` mit `edition: "Epid Bull 27/2026"`, `date: "2026-07-02"`, `url: "https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/27_26.pdf?__blob=publicationFile"`.
  - `hepatitisARule: Rule` mit `id: "hepatitis_a"`, `diseases: ["hepatitis_a"]`, `source: eb27(61, "Kap. 5.6 Hepatitis A, Tab. 5")`.
  - `RecommendationId` um `"hepatitis_a"` erweitert, `Reason` um `{ kind: "long_protection" }`.
  - `T.rec.status.protectedOpen = "geschützt, Auffrischung derzeit nicht vorgesehen"`.
  - `T.rec.detail.reason.longProtection = "Die Impfungen sind vollständig. Die STIKO rechnet mit einem Schutz für mindestens 10 bis 20 Jahre. Ob später eine Auffrischung nötig wird, ist derzeit offen."`

- [ ] **Step 1: Failing tests** in `hepatitisA.test.ts`. Heute ist `2026-11-27`, Vorlauf 6 Monate, Person `person("1985-05-05")` ohne Angaben.

| Testname (mit Fundstelle) | Impfungen | Erwartung |
|---|---|---|
| ohne Dosis keine Empfehlung (Epid Bull 27/2026, S. 61) | – | `status: "not_applicable"` |
| 1 Dosis Einzelimpfstoff: 2. frühestens nach 6 Monaten (Epid Bull 27/2026, S. 61, Tab. 5) | Havrix 2026-08-27 | `status: "soon"`, `dueDate: "2027-02-27"`, `latestDate: null`, `dose: {2, of 2}`, `timing: "follow_up"`, `reason: { kind: "started", given: 1, total: 2 }`, `source.page: 40` |
| 1 Dosis vor 8 Monaten ist fällig | Havrix 2026-03-27 | `status: "due"`, `dueDate: "2026-09-27"` |
| alte Einzeldosis wird nicht „überfällig“ (Epid Bull 4/2026, S. 40) | Havrix 2016-01-01 | `status: "due"`, `latestDate: null` |
| 2 Dosen Einzelimpfstoff: geschützt (Epid Bull 27/2026, S. 61) | Havrix 2020-01-01, Vaqta 2020-08-01 | `status: "protected"`, `dueDate: null`, `dose: null`, `reason: { kind: "long_protection" }` |
| Twinrix 0, 1, 6 Monate: geschützt (Epid Bull 27/2026, S. 62, Tab. 6) | Twinrix 2026-01-01, 2026-02-01, 2026-07-01 | `status: "protected"`, `reason: { kind: "long_protection" }` |
| 1 Twinrix: 2. Dosis nach 1 Monat | Twinrix 2026-11-01 | `status: "soon"`, `dueDate: "2026-12-01"`, `dose: {2, of 3}` |
| 2 Twinrix: 3. Dosis 5 Monate nach der 2. | Twinrix 2026-01-01, 2026-02-01 | `status: "due"`, `dueDate: "2026-07-01"`, `dose: {3, of 3}` |
| Twinrix-Schnellschema: 4. Dosis nach 12 Monaten (Epid Bull 4/2026, S. 23) | Twinrix 2026-01-01, 2026-01-08, 2026-01-22 | `dueDate: "2027-01-01"`, `dose: {4, of 4}`, `reason: { kind: "started", given: 3, total: 4 }` |
| gemischt: Twinrix und eine Einzeldosis ergeben 3. Dosis | Twinrix 2026-01-01, Havrix 2026-07-01 | `status: "soon"`, `dueDate: "2026-12-01"`, `dose: {3, of 3}` |
| gemischt: 2 Einzeldosen machen vollständig | Havrix 2020-01-01, Twinrix 2020-02-01, Havrix 2020-08-01 | `status: "protected"` |
| doppelt am selben Tag zählt einmal | Havrix 2026-03-27 zweimal | `dose: {2, of 2}` |
| freie Eingabe nur Hepatitis A zählt als Einzelimpfstoff | `freeShot("2026-03-27", ["hepatitis_a"])` | `dose: {2, of 2}` |
| freie Eingabe Hepatitis A und B zählt wie Twinrix | `freeShot("2026-03-27", ["hepatitis_a", "hepatitis_b"])` | `dose: {2, of 3}`, `dueDate: "2026-04-27"` |

Dazu: `hepatitisARule.id === "hepatitis_a"`, `diseases` gleich `["hepatitis_a"]`, `source` mit `edition: "Epid Bull 27/2026"`, `page: 61`.

- [ ] **Step 2: Failing tests für Regelwerk, Status und Detail**
  - `rulebook.test.ts`: Die ID-Liste hat `"hepatitis_a"` direkt nach `"hepatitis_b"`, die Größe ist 13, `RULEBOOK.sources` hat 6 Einträge (neu: Label `"Reiseimpfempfehlungen STIKO/DTG 2026, Epid. Bull. 27/2026"`), `compareVersions(RULEBOOK.version, "2026-11-27.1") > 0`. Statt `changes` gleich `[]`: genau ein Eintrag mit `version: RULEBOOK.version`, `ids: ["hepatitis_a", "hepatitis_b"]`, `validSince: "2026-07-02"` und nicht leerem `text`. Die Beispielperson ergibt 13 Empfehlungen, `hepatitis_a: "not_applicable"`.
  - Neuer Test in `rulebook.test.ts`: `evaluate` mit einer Havrix-Impfung und der Entscheidung `{ recommendationId: "hepatitis_a", kind: "declined" }` ergibt für `hepatitis_a` den Status `"declined"`.
  - `statusText.test.ts`: `protected` ohne `dueDate` mit `reason: { kind: "long_protection" }` ergibt `"geschützt, Auffrischung derzeit nicht vorgesehen"`. `protected` mit `reason: { kind: "complete" }` bleibt `"geschützt, keine Auffrischung nötig"`.
  - `RecommendationDetail.test.tsx`: Zwei Havrix-Impfungen, `open("hepatitis_a")` zeigt den Text von `T.rec.detail.reason.longProtection`.

- [ ] **Step 3: Tests laufen lassen und rot sehen**

Run: `npx vitest run src/core/rules src/app/overview/statusText.test.ts src/app/recommendation`
Expected: FAIL (Modul `hepatitisA` fehlt, ID-Liste ohne `hepatitis_a`).

- [ ] **Step 4: Implementieren**
  - `eb27.ts` nach dem Muster von `eb4.ts`, Kommentar: Seitenzahlen sind PDF-Seiten, gedruckt plus 10.
  - `hepatitisARule.evaluate`. Eine Dosis gilt als Einzelimpfstoff, wenn ihre `diseases` `"hepatitis_b"` nicht enthalten. Ablauf:

```text
doses = dosesOf(vs, "hepatitis_a")
0 Dosen                          → not_applicable, reason none
Einzelimpfstoff-Dosen ≥ 2        → protected, reason long_protection
Dosen ≥ 4                        → protected, reason long_protection
Dosen = 3                        → rapidFourthDose(...) mit reason started {3, 4}, sonst protected (long_protection)
1 Dosis Einzelimpfstoff          → nextInSeries mit [{ min: { months: 6 } }], reason started {1, 2}
sonst (1 Twinrix oder 2 Dosen)   → nextInSeries mit [{ min: { months: 1 } }, { min: { months: 5 } }], reason started {n, 3}
```

  `started`-Ergebnisse tragen `source: eb4(40, "Kap. 4.5 Impfabstände")`. Über der Regel ein Kommentar „offen:“ wie in `hepatitisB.ts`: Gemischte Serien regeln die Quellen nicht, ImpfPass zählt sie vollständig ab 2 Einzeldosen oder 3 Dosen insgesamt.
  - `rulebook.ts`: `hepatitisARule` nach `hepatitisBRule` in `rules`, Quelle in `sources`, `version` auf das Datum der Umsetzung mit laufender Nummer (größer als `2026-11-27.1`), `changes`-Eintrag wie im Test. `text`: „ImpfPass erinnert an fehlende Dosen angefangener Impfserien gegen Hepatitis A und B und zeigt, wann sie vollständig sind.“
  - `statusText`: bei `protected` ohne `dueDate` und `reason.kind === "long_protection"` → `S.protectedOpen`.
  - `ReasonSentence`: `case "long_protection"` → `R.longProtection`.
  - `T.rec.names.hepatitis_a = "Hepatitis A"`.

- [ ] **Step 5: Alle Tests, Lint, Typprüfung, Build grün**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: alles grün. Schlägt ein Test außerhalb der genannten Dateien fehl, weil er die Zahl der Empfehlungen (12) festschreibt, dort auf 13 anpassen und die Datei im Commit mitnehmen.

- [ ] **Step 6: Commit**

```bash
git add src/core/rules/recommendations/eb27.ts src/core/rules/recommendations/hepatitisA.ts src/core/rules/recommendations/hepatitisA.test.ts src/core/rules/types.ts src/core/rules/rulebook.ts src/core/rules/rulebook.test.ts src/texts.ts src/app/overview/statusText.ts src/app/overview/statusText.test.ts src/app/recommendation/RecommendationDetail.tsx src/app/recommendation/RecommendationDetail.test.tsx
git commit -m "feat(rules): hepatitis A series with long protection"
```

---

### Task 3: Hinweissätze unter „Weitere Impfungen“

**Files:**
- Create: `src/app/overview/otherHint.ts`, Test: `src/app/overview/otherHint.test.ts`
- Modify: `src/app/overview/OverviewScreen.tsx`, Test: `src/app/overview/OverviewScreen.test.tsx`
- Modify: `src/texts.ts` (`T.overview.otherHints`)

**Interfaces:**
- Consumes: `dosesOf` aus `src/core/rules/helpers.ts`; `hepatitisARule` im Regelwerk (Task 2), damit vollständige Hepatitis A unter „Geschützt“ steht.
- Produces: `otherHint(disease: DiseaseId, vaccinations: Vaccination[]): string | null`.

- [ ] **Step 1: Failing tests** in `otherHint.test.ts` (Impfungen mit `shot` aus `@/test/rules`):
  - Tollwut mit 3 Rabipur-Dosen (2020-01-01, 2020-01-08, 2020-01-29) → `T.overview.otherHints.rabiesComplete`.
  - Tollwut mit 2 Dosen → `rabiesTwo`; mit 2 Dosen am selben Tag → `rabiesOne`; mit 1 Dosis → `rabiesOne`.
  - Tuberkulose (BCG) → `tuberculosis`.
  - Pocken mit dem Impfstoff `pocken` → `smallpox`; Pocken nur mit Imvanex → `null`; Imvanex und `pocken` → `smallpox`.
  - Gelbfieber → `null`.

- [ ] **Step 2: Failing test** in `OverviewScreen.test.tsx`: Person 1985, Impfungen zwei Havrix (2020-01-01, 2020-08-01), drei Rabipur, BCG 1970, Pockenimpfstoff 1970, heute `2026-11-27`.
  - Der Abschnitt „Geschützt“ enthält einen Link „Hepatitis A“, der Abschnitt „Weitere Impfungen“ enthält kein „Hepatitis A“.
  - Im Abschnitt „Weitere Impfungen“ stehen die Texte `rabiesComplete`, `tuberculosis` und `smallpox`.
  - Zweiter Test: eine Havrix-Impfung und die Entscheidung `declined` für `hepatitis_a` (über `seed`) → „Hepatitis A“ steht unter „Ausgeblendet“, nicht unter „Weitere Impfungen“.

- [ ] **Step 3: Tests laufen lassen und rot sehen**

Run: `npx vitest run src/app/overview`
Expected: FAIL (Modul `otherHint` fehlt).

- [ ] **Step 4: Implementieren**
  - `T.overview.otherHints` mit genau diesen Texten:

```ts
otherHints: {
  rabiesComplete: "Grundimmunisierung vollständig, für Reisen ist keine Auffrischung nötig. Nach einem Biss trotzdem sofort zum Arzt.",
  rabiesTwo: "2 von 3 Dosen. Besteht weiter ein Risiko, empfiehlt die STIKO die 3. innerhalb eines Jahres. Nach einem Biss sofort zum Arzt.",
  rabiesOne: "Eine Dosis zählt noch nicht als Schutz. Nach einem Biss sofort zum Arzt.",
  tuberculosis: "Die STIKO empfiehlt die BCG-Impfung nicht mehr. Eine Auffrischung gibt es nicht.",
  smallpox: "Keine Auffrischung vorgesehen. Bei einer Mpox-Impfung zählt sie mit, dann reicht meist 1 Dosis.",
},
```

  - `otherHint`: Tollwut nach Zahl der Dosen aus `dosesOf` (ab 3, 2, 1). Pocken nur, wenn mindestens eine Pocken-Impfung `"mpox"` nicht enthält. Alle anderen Krankheiten `null`.
  - `OverviewScreen`: in der Liste „Weitere Impfungen“ unter „zuletzt geimpft …“ eine dritte Zeile `<span className="text-muted-foreground">` mit dem Satz, nur wenn `otherHint` nicht `null` ist.

- [ ] **Step 5: Alle Tests, Lint, Typprüfung, Build grün**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: alles grün.

- [ ] **Step 6: Im Browser prüfen.** `npx vite --port 5181 --strictPort` im Hintergrund, in der Handy-Breite (375 px) die Übersicht mit den Impfungen aus Step 2 ansehen: Hepatitis A grün mit „geschützt, Auffrischung derzeit nicht vorgesehen“, die drei Sätze lesbar umbrochen, keine waagrechte Scrollleiste. Danach den Server beenden.

- [ ] **Step 7: Commit**

```bash
git add src/app/overview/otherHint.ts src/app/overview/otherHint.test.ts src/app/overview/OverviewScreen.tsx src/app/overview/OverviewScreen.test.tsx src/texts.ts
git commit -m "feat(overview): protection notes for rabies, tuberculosis and smallpox"
```

---

## Abschluss

- [ ] Gesamten Stand prüfen: `npm run lint && npm run typecheck && npm test && npm run build`, `git status` sauber, drei Commits auf `main`.
- [ ] Den User fragen, ob gepusht werden soll. Erst nach seinem Ja `git push`, dann den Lauf mit `gh run watch` verfolgen und prüfen, dass der Text „Auffrischung derzeit nicht vorgesehen“ im ausgelieferten Bundle steht.
