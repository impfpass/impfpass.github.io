# ImpfPass

[![Testen und veröffentlichen](https://github.com/impfpass/impfpass.github.io/actions/workflows/pages.yml/badge.svg)](https://github.com/impfpass/impfpass.github.io/actions/workflows/pages.yml)

ImpfPass ist ein Impfpass für das Handy. Die Web-App zeigt die eigenen Impfungen sortiert nach Datum, Impfstoff oder Krankheit und nimmt neue Einträge auf. Alle Daten bleiben im Browser auf dem Gerät, es gibt keinen Server und keine Anfragen an Dritte.

ImpfPass ersetzt keine ärztliche Beratung.

ImpfPass läuft auf dem iPhone ab iOS 16.4 und in aktuellen Versionen von Chrome, Edge, Firefox und Safari. Auf älteren Geräten erscheint ein Hinweis statt einer leeren Seite.

Adresse: https://impfpass.github.io/

Für den PC gibt es eine zweite App unter https://impfpass.github.io/import/. Mit ihr lassen sich ältere Impfungen aus dem Papier-Impfpass übernehmen: Ein Chatbot liest die Seiten, das Ergebnis steht in einer Tabelle, die man prüft und korrigiert. Die Impfungen gehen dann per QR-Code, als Datei oder als Text aufs Handy. Auch die PC-App speichert alles nur im Browser.

## Entwicklung

Voraussetzung ist Node.js 22 oder neuer.

```sh
npm install
npm run dev        # Entwicklungsserver
npm run lint       # ESLint, Warnungen gelten als Fehler
npm run typecheck  # TypeScript
npm test           # Vitest
npm run build      # Build nach dist/
npm run preview    # Build lokal ansehen
```

## Veröffentlichen

Jeder Push auf `main` startet den Workflow `.github/workflows/pages.yml`. Er prüft Lint, Typen, Tests und Build und veröffentlicht nur, wenn alles grün ist.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
