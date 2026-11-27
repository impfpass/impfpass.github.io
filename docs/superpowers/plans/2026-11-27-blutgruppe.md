# Blutgruppe – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blutgruppe, Rhesusfaktor und Rhesusformel werden pro Person gespeichert, im Profil der Einstellungen angezeigt und gesichert.

**Architecture:** Drei optionale Felder an `Person` und im zod-Schema der Sicherung, eine neue Komponente `BloodFields` im Profil-Formular, Texte unter `T.settings.blood`.

**Tech Stack:** wie bisher (React 19, TypeScript, zod 4, shadcn `ToggleGroup`, Vitest).

**Spec:** `docs/superpowers/specs/2026-11-27-blutgruppe-design.md`

## Global Constraints

- Nur die genannten Dateien ändern und committen (`git add <pfad>`). `src/texts.ts` teilt sich die Arbeit mit der Plan-3-Nachrunde: nach dem Commit der Sitzung „ImpfPass Plan 2 (Empfehlungen) schreiben“ Bescheid geben.
- Nicht pushen ohne das Ja des Users.
- Alle sichtbaren Texte in `src/texts.ts`, deutsch, nach den Schreibregeln (Skill `vermenschlichen`). Bedienflächen mindestens 44 px hoch.
- Kern (`src/core/`) ohne Importe aus `src/app/` oder React.
- TDD, vor jedem Commit grün: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Commit-Nachrichten `feat: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Eine Sicherung aus der Zeit vor dieser Änderung (Person ohne die Felder) wird gelesen und nicht als beschädigt abgelehnt. Test in Task 1.
2. Profil speichern, ohne die Blutgruppe anzufassen, lässt vorhandene Angaben unverändert. Test in Task 2.
3. Nur Leerzeichen im Formelfeld speichert keine Formel. Test in Task 2.
4. Nach einer Wiederherstellung mit einer anderen Person zeigt das Formular deren Angaben (das Formular hängt schon an `key={person.id}`). Kein eigener Test nötig.
5. Lange Formel bricht auf 375 px nicht das Layout. Browser-Prüfung in Task 2.

---

### Task 1: Datenmodell und Sicherung

**Files:**
- Modify: `src/core/model.ts` (`Person`, neue Typen `BloodGroup`, `Rhesus`)
- Modify: `src/core/formats/schemas.ts` (`personSchema`)
- Test: `src/core/formats/backup.test.ts`

**Interfaces:**
- Produces: `export type BloodGroup = "0" | "A" | "B" | "AB"`, `export type Rhesus = "positive" | "negative"`, `export const BLOOD_GROUPS: readonly BloodGroup[] = ["0", "A", "B", "AB"]`; `Person` mit `bloodGroup?: BloodGroup`, `rhesus?: Rhesus`, `rhesusFormula?: string`.

- [ ] **Step 1: Failing tests** in `backup.test.ts`:
  - „Blutgruppe, Rhesusfaktor und Rhesusformel überstehen Speichern und Lesen“: `data.persons[0]` mit `bloodGroup: "A"`, `rhesus: "negative"`, `rhesusFormula: "ccddee"`; `parseBackup(serializeBackup(createBackup(...)))` ergibt dieselben Werte.
  - „eine Sicherung ohne Blutgruppe wird gelesen“: `validFile()` ohne die Felder, `parseBackup` wirft nicht, `persons[0].bloodGroup` ist `undefined`.
  - „unbekannte Blutgruppe ist beschädigt“: `bloodGroup: "C"` ergibt den Fehler „beschädigt“; ebenso `rhesus: "neutral"`.
- [ ] **Step 2:** `npx vitest run src/core/formats/backup.test.ts` → FAIL (Felder werden verworfen bzw. „C“ wird nicht abgelehnt).
- [ ] **Step 3:** Typen in `model.ts`, im `personSchema` `bloodGroup: z.enum(BLOOD_GROUPS).optional()`, `rhesus: z.enum(["positive", "negative"]).optional()`, `rhesusFormula: z.string().optional()`.
- [ ] **Step 4:** Test grün, dann Lint, Typprüfung, alle Tests, Build.
- [ ] **Step 5:** Commit `feat: blood group fields on the person and in backups`.

### Task 2: Anzeige und Eingabe in den Einstellungen

**Files:**
- Create: `src/app/settings/BloodFields.tsx`
- Modify: `src/app/settings/SettingsScreen.tsx` (`ProfileForm`)
- Modify: `src/texts.ts` (`T.settings.blood`)
- Test: `src/app/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `BloodGroup`, `Rhesus`, `BLOOD_GROUPS` (Task 1).
- Produces: `BloodFields(props: { idPrefix: string; group: BloodGroup | undefined; rhesus: Rhesus | undefined; formula: string; onGroup(v: BloodGroup | undefined): void; onRhesus(v: Rhesus | undefined): void; onFormula(v: string): void })`.

- [ ] **Step 1: Failing tests** in `SettingsScreen.test.tsx`:
  - „Profil speichert Blutgruppe, Rhesusfaktor und Rhesusformel“: Radio „A“ und „negativ“ antippen, in „Rhesusformel“ `CcD.ee` tippen, „Profil speichern“ → `data().person` hat `bloodGroup: "A"`, `rhesus: "negative"`, `rhesusFormula: "CcD.ee"`. Der Hinweis zur Transfusion steht auf der Seite.
  - „gespeicherte Blutgruppe ist ausgewählt und lässt sich entfernen“: Person mit `bloodGroup: "B"`, `rhesus: "positive"`, `rhesusFormula: "CCD.ee"` → Radio „B“ hat `aria-checked="true"`; „B“ erneut antippen, Formelfeld leeren bzw. nur Leerzeichen eintragen, speichern → `bloodGroup` und `rhesusFormula` `undefined`, `rhesus` bleibt `"positive"`.
  - „Name ändern lässt die Blutgruppe unverändert“: Person mit `bloodGroup: "AB"`, nur Name ändern, speichern → `bloodGroup` bleibt `"AB"`.
- [ ] **Step 2:** `npx vitest run src/app/settings` → FAIL.
- [ ] **Step 3:** `BloodFields` mit zwei `ToggleGroup type="single"` (wie die FSME-Frage in `AnswersFields`, je eine Gruppe mit `role="group"` und sichtbarer Beschriftung), einem `Input` für die Formel (`autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`, Hilfetext per `aria-describedby`) und dem Hinweis als Absatz. Ein leerer Wert aus `onValueChange` heißt „keine Angabe“. Im `ProfileForm` drei neue Zustände; beim Speichern `rhesusFormula: formula.trim() || undefined`. Texte:

```ts
blood: {
  title: "Blutgruppe",
  group: "Blutgruppe",
  groups: { "0": "0", A: "A", B: "B", AB: "AB" },
  rhesus: "Rhesusfaktor",
  positive: "positiv",
  negative: "negativ",
  formula: "Rhesusformel",
  formulaHelp: "So wie im Impfpass, zum Beispiel CcD.ee.",
  hint: "Vor einer Bluttransfusion bestimmt die Klinik die Blutgruppe immer selbst. Die Angaben hier sind zum Nachschauen, etwa beim Blutspenden oder in der Schwangerschaft.",
},
```

- [ ] **Step 4:** Tests grün, dann Lint, Typprüfung, alle Tests, Build.
- [ ] **Step 5:** Im Browser bei 375 px prüfen: Abschnitt lesbar, Schaltflächen mindestens 44 px, keine waagrechte Scrollleiste.
- [ ] **Step 6:** Commit `feat(settings): blood group, rhesus factor and formula in the profile`, danach der Plan-3-Sitzung melden, dass `src/texts.ts` frei ist.

## Abschluss

- [ ] Frischer Reviewer über beide Commits, Funde nach Schwere behandeln.
- [ ] Den User fragen, ob gepusht werden soll.
