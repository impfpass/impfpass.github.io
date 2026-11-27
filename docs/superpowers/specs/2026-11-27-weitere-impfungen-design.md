# Weitere Impfungen: Schutzdauer und angefangene Serien

Kurzer Entwurf vom 2026-11-27, Ergänzung zu `2026-11-26-impfpass-design.md`. Umsetzung erst, wenn Plan 3 abgeschlossen ist.

## Worum es geht

Unter „Weitere Impfungen“ zeigt ImpfPass heute nur Krankheit und letztes Impfdatum. Beim User stehen dort Hepatitis A, Hepatitis B, Pocken, Tollwut und Tuberkulose. Er möchte sehen, wie lange er geschützt ist und ob etwas zu tun ist. Fehlt bei einer angefangenen Serie noch eine Dosis, soll sie fällig werden wie andere Empfehlungen und später (Plan 4) als Erinnerung in die GTD-App gehen.

Hepatitis B steht dort, weil die bestehende Regel nur bei beruflichem Risiko oder Arzt-Empfehlung greift. Für Hepatitis A gibt es keine Regel, Reiseimpfungen werden laut Hauptentwurf (Abschnitt 7.1) nur angezeigt, nicht empfohlen.

## Ziele

- Hepatitis A und B: vollständige Serie grün unter „Geschützt“, angefangene Serie mit fälliger nächster Dosis.
- Tollwut, Tuberkulose und Pocken: ein Satz zu Schutzdauer oder Auffrischung unter „Weitere Impfungen“, ohne Farbe.

## Nicht Teil dieser Änderung

- Reiseimpf-Empfehlungen und Fragen nach Reisen. Sie bleiben laut Hauptentwurf für später.
- Hepatitis A wegen des Berufs empfehlen. Die STIKO nennt Gesundheitsdienst, Kita und Abwasser, und die Berufsfragen gibt es schon. *(Festlegung Claude: eigener späterer Schritt)*
- Hinweissätze für andere Reiseimpfungen (Gelbfieber, Typhus, Mpox usw.).
- Erinnerungen an Tollwut-Dosen, weil die vom Risiko abhängen.

## Was nicht passieren darf

- Rot oder Gelb, ohne dass eine Quelle die Dosis unabhängig von Reise oder Beruf verlangt.
- „Geschützt“ bei Tollwut. Nach einem Biss ist trotzdem sofort eine Impfung nötig, ein grüner Haken würde das verschleiern.

## Wege

1. Nur ein Hinweissatz je Krankheit, keine Farbe. Beantwortet die Frage nach der Schutzdauer, erinnert aber nicht an fehlende Dosen.
2. Grün, wo die STIKO es hergibt (vollständige Hepatitis-A- und -B-Serie), sonst Hinweissatz. Keine Erinnerungen.
3. Erinnerung an alles mit Fragen nach Reise und Beruf. Widerspricht der Abgrenzung von Phase 1.

**Gewählt (User, 2026-11-27):** eine Mischung aus 2 und 3. Grün bei vollständiger Serie, Fälligkeit bei angefangener Serie von Hepatitis A oder B, Hinweissätze für Tollwut, Tuberkulose und Pocken. Grund: Eine angefangene Serie wird laut STIKO ohne Neubeginn zu Ende geführt, dafür braucht die App keine Frage nach Reise oder Beruf. Alles andere hängt vom Risiko ab.

## Regeln

### Hepatitis A (neue Regel `hepatitis_a`)

- Ohne Dosis: `not_applicable`, also unsichtbar wie heute.
- Einzelimpfstoff (alle Impfstoffe nur gegen Hepatitis A, auch unbekannte): 2 Dosen, die 2. frühestens 6 Monate nach der 1.
- Twinrix: 3 Dosen nach 0, 1 und 6 Monaten.
- Gemischte Serie: vollständig bei 2 Dosen Einzelimpfstoff oder bei 3 Dosen insgesamt, sonst nächste Dosis im Twinrix-Abstand. Die Quellen sagen dazu nichts. *(Festlegung Claude, im Code als „offen“ kommentieren wie in `hepatitisB.ts`)*
- Kein spätester Termin, weil fehlende Dosen ohne Neubeginn nachgeholt werden.
- Vollständig: `protected` ohne Datum. Die Detailansicht nennt den Schutz von mindestens 10 bis 20 Jahren und dass laut STIKO offen ist, ob später aufgefrischt werden muss.
- Neue `Reason`-Art für die angefangene Serie. Detailtext etwa: Die Serie ist angefangen, fehlende Dosen werden nachgeholt, ohne neu anzufangen.
- „Möchte ich nicht“ blendet sie aus wie jede andere Empfehlung.

### Hepatitis B (bestehende Regel ändern)

- Neu: Ohne Beruf und ohne Arzt-Empfehlung, aber mit mindestens einer Dosis, wird die Serie fortgesetzt wie bei beruflicher Indikation. Vollständig ergibt `protected`.
- Eine angefangene Serie geht der Karte „Mit dem Arzt besprechen“ bei chronischer Erkrankung vor. *(Festlegung Claude)*
- Ohne Dosis bleibt alles wie bisher.

### Schnellschema (beide Regeln)

Liegt die 3. Dosis höchstens 2 Monate nach der 1., war es ein Schnellschema (Twinrix 0, 7, 21 Tage; Hepatitis B 0, 1, 2 Monate). Dann folgt eine 4. Dosis 12 Monate nach der 1. *(Festlegung Claude, aus den Schemata in Epid Bull 27/2026 abgeleitet)*

### Hinweissätze unter „Weitere Impfungen“

Dritte Zeile unter „zuletzt geimpft …“, grau. Ein Tipp öffnet weiter den letzten Eintrag. Endgültige Formulierung beim Bauen nach den Schreibregeln:

| Fall | Satz (Entwurf) |
|---|---|
| Tollwut, 3 oder mehr Dosen | Grundimmunisierung vollständig, für Reisen ist keine Auffrischung nötig. Nach einem Biss trotzdem sofort zum Arzt. |
| Tollwut, 2 Dosen | 2 von 3 Dosen. Besteht weiter ein Risiko, die 3. innerhalb eines Jahres. Nach einem Biss sofort zum Arzt. |
| Tollwut, 1 Dosis | Eine Dosis zählt noch nicht als Schutz. Nach einem Biss sofort zum Arzt. |
| Tuberkulose | Die STIKO empfiehlt die BCG-Impfung nicht mehr. Eine Auffrischung gibt es nicht. |
| Pocken | Keine Auffrischung vorgesehen. Bei einer Mpox-Impfung zählt sie mit, dann reicht meist 1 Dosis. |

### Regelwerk

- Neue Quelle: Reiseimpfempfehlungen STIKO/DTG 2026, Epid Bull 27/2026 vom 02.07.2026, https://www.rki.de/DE/Aktuelles/Publikationen/Epidemiologisches-Bulletin/2026/27_26.pdf?__blob=publicationFile
- Regelwerk-Version erhöhen, damit bestehende Nutzer einmal „Neu“ für Hepatitis A oder B sehen. Dazu ein `changes`-Eintrag mit kurzem Text.

## Quellen

Gelesen am 2026-11-27. Seiten in 4/2026 gedruckt gleich PDF; in 27/2026 ist die PDF-Seite die gedruckte plus 10.

| Aussage | Fundstelle |
|---|---|
| Hep A: 2 Dosen Einzelimpfstoff, Abstand 6 bis 12 (Vaqta 18) Monate | 27/2026, S. 51, Tab. 5 |
| Hep A: 1 Dosis schützt mindestens 6 Monate | 4/2026, S. 23 |
| Hep A: Schutz mindestens 10 bis 20 Jahre, ob Auffrischung nötig ist, „derzeit unklar“ | 27/2026, S. 51 |
| Twinrix: 0, 1, 6 Monate; Schnellschema 0, 7, 21 Tage plus 12 Monate | 27/2026, S. 52, Tab. 6; 4/2026, S. 23 |
| Hep B: 0, 1, 6 Monate oder 0, 1, 2, 12 Monate | 27/2026, S. 56, Tab. 7 |
| Hep B: nach erfolgreicher Impfung im Allgemeinen keine Auffrischung | 4/2026, S. 13 |
| Unvollständige Serie wird komplettiert, nicht neu begonnen, auch Hep A und B | 4/2026, S. 40 |
| Tollwut: 3 Dosen an Tag 0, 7, 21 oder 28 | 4/2026, S. 34 |
| Tollwut: Boosterfähigkeit Jahrzehnte, ggf. lebenslang; Reisende ohne Routine-Kontrolle | 27/2026, S. 79; 4/2026, S. 19 |
| Tollwut: nach 2 Dosen 3. spätestens nach einem Jahr bei weiterer Exposition | 4/2026, S. 60, Fußnote b |
| Tollwut: nach vollständiger PrEP bei Exposition 2 Dosen an Tag 0 und 3 | 4/2026, S. 59 |
| BCG: „wird nicht empfohlen“ | 4/2026, S. 19 |
| Frühere Pockenimpfung: bei Immunkompetenten reicht 1 Dosis Mpox-Impfstoff | 4/2026, S. 16 |

## Tests (mindestens)

- Hep A: 1 Havrix vor 3 Monaten ergibt „2. Dosis ab …“; vor 8 Monaten fällig; 2 Havrix geschützt; 3 Twinrix nach 0, 1, 6 Monaten geschützt; 2 Twinrix ergibt 3. Dosis; 3 Twinrix in 21 Tagen ergibt 4. Dosis 12 Monate nach der 1.; „Möchte ich nicht“ blendet aus.
- Hep B ohne Beruf: 0 Dosen unverändert `not_applicable`, 1 Dosis ergibt 2. Dosis, 3 Dosen geschützt.
- Übersicht: vollständige Hepatitis A steht unter „Geschützt“ und nicht mehr unter „Weitere Impfungen“; Tollwut mit 3 Dosen zeigt den Hinweissatz.

## Dem Builder überlassen

Dateiaufteilung, Formulierung der Texte nach den Schreibregeln und weitere Testfälle.
