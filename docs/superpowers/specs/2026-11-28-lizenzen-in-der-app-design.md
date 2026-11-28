# Lizenzen in der App

Kurzer Entwurf vom 2026-11-28. Anlass ist der Test auf dem iPhone nach dem Push der Restliste von Plan 3.

## Worum es geht

Auf der Info-Seite der Handy-App führt der Link „Lizenztexte ansehen“ zur Datei `third-party-licenses.txt`. Die Datei liegt unter derselben Adresse wie die App, deshalb öffnet iOS sie im Fenster der Home-Bildschirm-App. Dort gibt es keinen Zurück-Knopf und keine Leiste unten. Man kommt nur heraus, indem man die App schließt. Außerdem ist die Datei sehr lang (58 Pakete, 87 KB).

Nutzer der App sollen sehen, welche Software drinsteckt, übersichtlich nach Projekten, etwa „React, MIT“ statt hundert einzelner Pakete mit seitenlangen Lizenztexten. Die vollständigen Texte bleiben erreichbar.

## Ziele

- Neue Seite „Verwendete Software“ in der App: eine Übersicht nach Projekten mit ihren Lizenzen, etwa eine iPhone-Bildschirmseite lang.
- Darunter ein Link zu einer zweiten Seite in der App mit den vollständigen Lizenztexten.
- Beide Seiten haben einen Zurück-Link und die Leiste unten. Sie funktionieren auch ohne Netz.
- Die Info-Seite verlinkt die Übersicht innerhalb der App statt der Datei.
- Die Übersicht bleibt nach Updates richtig: Der Build bricht ab, wenn ein Paket keinem Projekt zugeordnet ist.

## Nicht Teil dieser Änderung

- PC-App: Ihr Link im Fuß öffnet die Datei weiter in einem neuen Browser-Tab. Den schließt man einfach wieder.
- Beschreibungen, wozu ein Projekt dient. Sie würden die Übersicht über eine Bildschirmseite hinaus verlängern.
- Anzeige im Entwicklungsserver. Die Dateien entstehen nur beim Build, im Entwicklungsserver erscheint die Fehlermeldung.

## Wege

1. Feste Zuordnung mit Prüfung: Eine Liste im Code legt fest, welche Pakete zu welchem Projekt gehören. Der Build liest die Lizenzen aus den Paketen und bricht ab, wenn die Liste nicht zu den Paketen im Build passt. Bei einer neuen Bibliothek kommt eine Zeile in die Liste.
2. Automatisch nach direkten Abhängigkeiten: zeigt die Bibliotheken, die ImpfPass selbst einbindet, ohne Pflege. Liefert Paketnamen statt Projektnamen (react und react-dom getrennt) und braucht eigene Regeln für Hilfspakete, die mehrere Bibliotheken gemeinsam nutzen.

**Gewählt:** Weg 1 (vom User gewählt).

## Festlegungen *(Claude)*

- Zuordnung in `vite/licenseProjects.ts`: je Projekt ein Name und eine Liste aus exakten Paketnamen oder Präfixen wie `@radix-ui/` und `workbox-`. Hilfspakete zählen zu dem Projekt, das sie mitbringt. Startliste nach dem heutigen Build:
  - React: react, react-dom, scheduler, use-sync-external-store
  - Radix UI: `@radix-ui/`, aria-hidden, get-nonce, react-remove-scroll, react-remove-scroll-bar, react-style-singleton, tslib, use-callback-ref, use-sidecar
  - shadcn/ui: shadcn, class-variance-authority, clsx, cn
  - Tailwind CSS: tailwindcss, tw-animate-css
  - Lucide: lucide-react
  - wouter: wouter, regexparam
  - Zod: zod
  - idb: idb
  - jsQR: jsqr
  - qrcode: qrcode, dijkstrajs
  - fflate: fflate
  - Workbox: `workbox-`
- Prüfung im Build: Fehler, wenn ein Paket keinem Projekt zugeordnet ist, wenn es mehreren zugeordnet ist oder wenn ein Projekt kein Paket im Build hat (veralteter Eintrag).
- Das Plugin legt neben der Textdatei `third-party-licenses.json` ab: die Gesamtzahl der Pakete und je Projekt den Namen und die Lizenzen. Lizenzen sind die verschiedenen Kennungen der Pakete, wie sie in deren package.json stehen (etwa „MIT“, „Apache-2.0“), sortiert. Projekte stehen alphabetisch.
- Der Service Worker speichert die JSON-Datei vor (`json` in `globPatterns`).
- Routen: `/einstellungen/info/lizenzen` für die Übersicht und `/einstellungen/info/lizenzen/texte` für die vollständigen Texte. Zurück-Links führen von der Übersicht zur Info-Seite und von den Texten zur Übersicht. Auf der Textseite steht der Zurück-Link zusätzlich am Ende.
- Die Textseite zeigt die Textdatei als vorformatierten Text mit Zeilenumbruch in kleinerer Schrift.
- Beim Laden steht der vorhandene Text „Wird geladen …“, bei einem Fehler eine Meldung mit `role="alert"`.
- Die Texte der Info-Seite bekommen eigene Schlüssel, damit der Fuß der PC-App unverändert bleibt.

## Tests (mindestens)

- Plugin: Die Zuordnung fasst Pakete zu Projekten zusammen und sammelt deren Lizenzen. Fehler bei einem nicht zugeordneten Paket, bei einem doppelt zugeordneten Paket und bei einem Projekt ohne Paket. Die JSON-Datei wird mit dem erwarteten Inhalt ausgegeben.
- Übersicht: zeigt Gesamtzahl, Projekte mit Lizenzen, den Link zu den Texten und den Zurück-Link zur Info-Seite. Fehlermeldung, wenn das Laden scheitert.
- Textseite: zeigt den Text der Datei und zwei Zurück-Links zur Übersicht. Fehlermeldung, wenn das Laden scheitert.
- Info-Seite: Der Link führt zu `#/einstellungen/info/lizenzen` und öffnet kein neues Fenster.
- Service Worker: `json` gehört zu den vorgespeicherten Dateimustern.
