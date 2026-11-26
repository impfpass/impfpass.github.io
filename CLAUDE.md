# ImpfPass

Impfpass als Web-App für das Handy. Man trägt Impfungen ein, sieht sie nach Datum, Impfstoff oder Krankheit sortiert und sichert sie als Datei. Später kommen STIKO-Empfehlungen, ein Import vom PC und Erinnerungen über die GTD-App des Betreuers dazu. Alles läuft im Browser, es gibt keinen Server.

- Design (verbindlich): `docs/superpowers/specs/2026-11-26-impfpass-design.md`
- Umsetzungspläne: `docs/superpowers/plans/`, aktuell Plan 1 `2026-11-26-impfpass-01-grundgeruest.md`

## Befehle

```sh
npm run dev        # Entwicklungsserver
npm run lint       # ESLint mit --max-warnings=0
npm run typecheck  # tsc -b
npm test           # vitest run (jsdom, Zeitzone Europe/Berlin)
npm run build      # Build nach dist/
npm run preview    # Build lokal ansehen
npm run format     # Prettier
```

Vor jedem Commit müssen Lint, Typprüfung, Tests und Build grün sein.

## Ordner

- `src/core/`: reine, getestete Funktionen ohne Oberfläche (Datenmodell, Datumshilfen, Impfstoffliste, Speicher, Sicherungsformat). Kein React hier.
- `src/app/`: die Oberfläche. Sie liest und schreibt nur über den Kern. Alle Texte stehen in `src/app/texts.ts`.
- `src/components/ui/`: shadcn/ui-Bausteine (`npx shadcn@latest add <name>`).
- `src/lib/`: kleine Hilfen für die Oberfläche (`cn`).
- `src/test/`: Test-Setup (fake-indexeddb, cleanup).
- `docs/`: Design, Pläne, Entwicklungsnotizen (`docs/dev-log/`).

## Regeln

- Zur Laufzeit keine Anfragen an Dritte, keine externen Schriften, keine Analyse-Dienste. Alle Bibliotheken werden mitgeliefert.
- Alle Daten bleiben im Browser (IndexedDB). Sie verlassen das Gerät nur, wenn der Anwender es ausdrücklich auslöst.
- Oberfläche nur Deutsch. Jeder sichtbare Text steht in `src/app/texts.ts`.
- Handy-App an der Wurzel von `https://impfpass.github.io/`, Repo `impfpass/impfpass.github.io`, Lizenz MIT. Die Adresse darf sich nach der ersten echten Nutzung nicht mehr ändern, weil der Browser-Speicher an der Domain hängt.
- Voreinstellungen: Vorlauf 6 Monate, Saison-Tag `09-01`.
- Gut lesbar auch für Ältere: Grundschrift 18 px (`html { font-size: 112.5% }`), Bedienflächen mindestens 44 × 44 px, helles und dunkles Design nach Systemeinstellung.
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`). Bestätigungen laufen über shadcn `AlertDialog`.
- Kalenderdaten sind Strings `YYYY-MM-DD`. Mit `Date` wird nur in `todayISO` gerechnet, denn `new Date().toISOString()` liefert UTC und damit nachts in Deutschland den Vortag.
- Bezeichner im Code englisch, Texte der Oberfläche deutsch.
- CI mit Node 22. Die Tests laufen vor jedem Deploy, bei Fehlern wird nicht veröffentlicht.
- Arbeitsweise TDD: erst der fehlschlagende Test, dann der Code.
- Commit-Nachrichten im Stil `feat: …`, `fix: …`, `chore: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
