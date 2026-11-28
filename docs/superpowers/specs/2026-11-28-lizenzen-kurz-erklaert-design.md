# Lizenzen kurz erklärt

Kurzer Entwurf vom 2026-11-28. Vom User besprochen und freigegeben („Passt so, leg los“). Baut auf `2026-11-28-lizenzen-in-der-app-design.md` auf.

## Worum es geht

Die Übersicht „Verwendete Software“ nennt je Projekt Lizenzkennungen wie „MIT“ oder „Apache-2.0“. Laien wissen nicht, was sie bedeuten. Eine eigene Seite erklärt die verwendeten Lizenzen (heute fünf) kurz und verständlich.

## Ziele

- Unter der Liste der Übersicht stehen zwei Links untereinander: „Alle Lizenzen kurz erklärt“ (neu) und „Lizenztexte aller Pakete ansehen“ (bisher „Alle Lizenztexte ansehen“, vom User umbenannt, „aller“ statt „alle“ als Festlegung Claude).
- Neue Seite „Lizenzen kurz erklärt“ mit Zurück-Link zur Übersicht und der Leiste unten, auch ohne Netz.
- Oben ein Absatz, was alle Lizenzen gemeinsam haben. Dann je Lizenz, die im Build vorkommt, die Kennung wie auf der Übersicht als Überschrift, zwei bis drei Sätze und „Kommt vor bei: …“ mit den Projekten. Am Ende ein Satz, dass ImpfPass die Hinweise mitliefert und der Lizenztext verbindlich ist.
- Der Build bricht ab, wenn eine Lizenz ohne Erklärung vorkommt.

## Nicht Teil dieser Änderung

- PC-App.
- Rechtliche Feinheiten wie die Wirkung der Unlicense in Deutschland.

## Wege

1. Erklärungen fest in `src/texts.ts`, Seite liest die vorhandene Übersicht (`third-party-licenses.json`) und zeigt nur vorkommende Lizenzen, Build prüft die Vollständigkeit. Gewählt.
2. Statische Seite mit allen fünf Erklärungen ohne Bezug zum Build. Einfacher, zeigt aber veraltete Lizenzen weiter an und kann „Kommt vor bei“ nicht nennen.

## Texte (vom User freigegeben)

- Einleitung: „Alle Lizenzen hier sind freie Lizenzen. Sie erlauben, die Software zu nutzen, zu ändern und weiterzugeben, auch kommerziell. Alle schließen Gewährleistung und Haftung der Urheber aus. Sie unterscheiden sich darin, was man bei der Weitergabe mitliefern muss.“
- MIT: „Die MIT-Lizenz erlaubt jede Nutzung. Bedingung: Urheberhinweis und Lizenztext müssen bei jeder Weitergabe dabei sein.“
- ISC: „Die ISC-Lizenz entspricht inhaltlich der MIT-Lizenz, sie ist nur kürzer formuliert. Auch hier müssen Urheberhinweis und Lizenztext mitgeliefert werden.“
- Apache-2.0: „Die Apache-Lizenz 2.0 erlaubt jede Nutzung. Lizenztext und Urheberhinweise müssen mitgeliefert werden, ebenso eine NOTICE-Datei, falls das Paket eine hat. Geänderte Dateien müssen als geändert gekennzeichnet sein. Außerdem erlauben die Urheber die Nutzung ihrer Patente, soweit sie die Software betreffen. Wer vor Gericht behauptet, die Software verletze ein Patent, verliert diese Erlaubnis.“ (Letzter Satz nach dem Review korrigiert, Apache-Lizenz Abschnitt 3: Die Erlaubnis endet für jeden, der klagt und behauptet, die Software verletze ein Patent. Vorher stand dort „Wer wegen solcher Patente klagt“.)
- 0BSD: „Die Zero-Clause-BSD-Lizenz erlaubt jede Nutzung ohne Bedingung. Nicht einmal ein Urheberhinweis ist nötig.“
- Unlicense: „Mit der Unlicense gibt der Urheber die Software für die Allgemeinheit frei. Jede Nutzung ist erlaubt, ohne Bedingung.“
- Schluss: „ImpfPass liefert die Urheberhinweise und Lizenztexte aller Pakete mit. Verbindlich ist jeweils der Lizenztext selbst.“

## Festlegungen *(Claude)*

- Route `/einstellungen/info/lizenzen/erklaert`, Überschrift „Lizenzen kurz erklärt“, Lizenzen in der Reihenfolge der Texte oben, Projekte in „Kommt vor bei“ in der Reihenfolge der Übersicht.
- Kommt trotz Build-Prüfung eine Lizenz ohne Erklärung an (etwa eine alte offene Seite mit der Datei einer neueren Version), steht sie am Ende mit dem Satz „Für diese Lizenz gibt es hier keine Erklärung. Ihr Text steht bei den Lizenztexten aller Pakete.“
- Die drei Lizenzseiten teilen sich Ladezustand (`useLoaded`) und Zurück-Link zur Übersicht (`BackToSummary`).
