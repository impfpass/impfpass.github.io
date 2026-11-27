# ImpfPass

Impfpass als Web-App für das Handy. Man trägt Impfungen ein, sieht sie nach Datum, Impfstoff oder Krankheit sortiert und sichert sie als Datei. Später kommen STIKO-Empfehlungen, ein Import vom PC und Erinnerungen über die GTD-App des Betreuers dazu. Alles läuft im Browser, es gibt keinen Server.

- Design (verbindlich): `docs/superpowers/specs/2026-11-26-impfpass-design.md`
- Umsetzungspläne: `docs/superpowers/plans/`, Plan 1 `2026-11-26-impfpass-01-grundgeruest.md` ist umgesetzt, aktuell ist Plan 2 `docs/superpowers/plans/2026-11-27-impfpass-02-empfehlungen.md`. Recherchen zu den STIKO-Regeln liegen in `docs/stiko/`

## Befehle

```sh
npm run dev        # Entwicklungsserver
npm run lint       # ESLint mit --max-warnings=0
npm run typecheck  # tsc -b
npm test           # vitest run (jsdom, Zeitzone Europe/Berlin)
npm run build      # Build nach dist/
npm run preview    # Build lokal ansehen
npm run format     # Prettier
npm run icons      # App-Symbole aus public/icon.svg erzeugen (pwa-assets.config.ts)
```

Vor jedem Commit müssen Lint, Typprüfung, Tests und Build grün sein.

## Ordner

- `src/core/`: reine, getestete Funktionen ohne Oberfläche (Datenmodell, Datumshilfen, Impfstoffliste, Speicher, Sicherungsformat). Kein React hier.
- `src/app/`: die Oberfläche. Sie liest und schreibt nur über den Kern.
- `src/texts.ts`: alle sichtbaren Texte, für Oberfläche und Kern (etwa Fehlermeldungen der Sicherung). Der Kern importiert nichts aus `src/app/`, `src/components/`, `react` und `react-dom`, das prüft `src/core/boundaries.test.ts`.
- `src/components/ui/`: shadcn/ui-Bausteine (`npx shadcn@latest add <name>`). Nach dem Hinzufügen prüfen: Die CLI schreibt manchmal `import { cn } from "cn"` statt `"@/lib/utils"`, und die Standardhöhen (h-8, h-9) sind bei 18 px Grundschrift unter 44 px. Button und Input sind auf h-11 angepasst.
- `src/lib/`: kleine Hilfen für die Oberfläche (`cn` aus dem Paket `cn`, das clsx und tailwind-merge ersetzt).
- `src/test/`: Test-Setup (fake-indexeddb, cleanup).
- `docs/`: Design, Pläne, Entwicklungsnotizen (`docs/dev-log/`).

## Veröffentlichen

- Repo `impfpass/impfpass.github.io` (Organisation `impfpass`), Adresse `https://impfpass.github.io/`.
- Jeder Push auf `main` startet `.github/workflows/pages.yml` (Node 22): `npm ci`, Lint, Typprüfung, Tests, Build. Nur wenn alles grün ist, veröffentlicht der Job `deploy` auf GitHub Pages. Manuell startbar über „Run workflow“ (`workflow_dispatch`).
- In den Repo-Einstellungen steht Pages auf „GitHub Actions“ (`build_type=workflow`).
- Verlauf ansehen: `gh run list`, `gh run watch`.
- Die Adresse nie ändern: Der Browser-Speicher hängt an der Domain, unter einer neuen Adresse öffnet jede installierte App leer.

## Regeln

- Zur Laufzeit keine Anfragen an Dritte, keine externen Schriften, keine Analyse-Dienste. Alle Bibliotheken werden mitgeliefert.
- Alle Daten bleiben im Browser (IndexedDB). Sie verlassen das Gerät nur, wenn der Anwender es ausdrücklich auslöst.
- Oberfläche nur Deutsch. Jeder sichtbare Text steht in `src/texts.ts`.
- Handy-App an der Wurzel von `https://impfpass.github.io/`, Repo `impfpass/impfpass.github.io`, Lizenz MIT. Die Adresse darf sich nach der ersten echten Nutzung nicht mehr ändern, weil der Browser-Speicher an der Domain hängt.
- Voreinstellungen: Vorlauf 6 Monate, Saison-Tag `09-01`.
- Gut lesbar auch für Ältere: Grundschrift 18 px (`html { font-size: 112.5% }`), Bedienflächen mindestens 44 × 44 px, helles und dunkles Design nach Systemeinstellung.
- zod läuft mit `jitless: true` (in `src/core/formats/schemas.ts`), sonst meldet die CSP einen eval-Verstoß.
- Mindestens iOS 16.4 (Build-Ziel von Vite 8, Radix nutzt `toSorted`). `vite/bootFallback.ts` setzt eine Startmeldung in `#root`, die React ersetzt; bleibt sie stehen, erscheint nach 10 s der Hinweis auf den zu alten Browser.
- Service Worker mit `skipWaiting` und `clientsClaim` (`vite/pwa.ts`), damit neue Versionen ohne Schließen aller Fenster ankommen.
- Keine nativen Dialoge (`confirm`, `alert`, `prompt`). Bestätigungen laufen über shadcn `AlertDialog`.
- Katalog-IDs nie umbenennen oder neu vergeben (Impfstoffe in `src/core/catalog/products.ts`, Krankheiten in `src/core/catalog/diseases.ts`). Sie stehen in gespeicherten Impfungen und in Sicherungen. Ein Impfstoff, der nicht mehr im Handel ist, bekommt `historic: true`; ein neuer Name kommt als Alias dazu. Dasselbe gilt für die Empfehlungs-IDs (`RecommendationId`): Sie stehen in Entscheidungen, Regel-Ständen und Sicherungen.
- Kalenderdaten sind Strings `YYYY-MM-DD`. Mit `Date` wird nur in `todayISO` gerechnet, denn `new Date().toISOString()` liefert UTC und damit nachts in Deutschland den Vortag.
- Bezeichner im Code englisch, Texte der Oberfläche deutsch.
- CI mit Node 22. Die Tests laufen vor jedem Deploy, bei Fehlern wird nicht veröffentlicht.
- Arbeitsweise TDD: erst der fehlschlagende Test, dann der Code.
- Commit-Nachrichten im Stil `feat: …`, `fix: …`, `chore: …`, abgeschlossen mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Regeln aktualisieren

Der Workflow `.github/workflows/stiko-watch.yml` prüft monatlich vier RKI-Seiten (Empfehlungen, Begründungen, Mitteilungen, Jahresarchiv des Epidemiologischen Bulletins) gegen `scripts/stiko-watch/state.json` und legt bei einer Änderung ein Issue „STIKO-Seiten geändert (…)“ an. Er committet nichts. Ablauf:

1. Das Issue lesen und die genannten Stellen im Epidemiologischen Bulletin nachlesen.
2. Fällt eine Regel weg, ändert sie sich oder kommt eine dazu: erst die Tests in `src/core/rules/recommendations/*.test.ts` für den neuen Stand schreiben, mit Fundstelle im Testnamen, und rot sehen.
3. Regel und `source` anpassen. Empfehlungs-IDs nie umbenennen; eine weggefallene Empfehlung wird aus `RULEBOOK.rules` entfernt, ihr Name bleibt in `T.rec.names`.
4. In `src/core/rules/rulebook.ts` `version` hochzählen (Datum des Updates und laufende Nummer, etwa `2027-02-03.1`), bei einer neuen Gesamtausgabe `edition` und `editionUrl` ändern, und einen Eintrag in `changes` anlegen (`ids`, `validSince` = Veröffentlichung im Epid. Bull., `text` für den Hinweis, ein Satz, der nach „Neu:“, „Geändert:“ oder „Entfällt:“ steht).
5. `npm run stiko:accept`, damit der Wächter den neuen Stand kennt (braucht Netz, dauert wegen der 30 s Pause je Abruf etwa 2 Minuten).
6. Lint, Typprüfung, Tests, Build; Commit `feat(rules): …`; Push startet den Deploy; das Issue mit Verweis auf den Commit schließen.

Ändert sich nur das Layout der RKI-Seite oder etwas ohne Bezug zu den Regeln: nur Schritt 5 und 6.
