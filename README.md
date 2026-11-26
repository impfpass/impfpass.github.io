# ImpfPass

ImpfPass ist ein Impfpass für das Handy. Die Web-App zeigt die eigenen Impfungen sortiert nach Datum, Impfstoff oder Krankheit und nimmt neue Einträge auf. Alle Daten bleiben im Browser auf dem Gerät, es gibt keinen Server und keine Anfragen an Dritte.

ImpfPass ersetzt keine ärztliche Beratung.

Adresse: https://impfpass.github.io/

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

## Lizenz

MIT, siehe [LICENSE](LICENSE).
