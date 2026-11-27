# Blutgruppe, Rhesusfaktor und Rhesusformel

Kurzer Entwurf vom 2026-11-27. Vom User besprochen und freigegeben („Ja, nach Plan 3“, „kannst gleich anfangen“).

## Worum es geht

Im Papier-Impfpass des Users stehen Blutgruppe, Rhesusfaktor und Rhesusformel. ImpfPass soll sie speichern und in den Einstellungen anzeigen, damit der Papierpass auch dafür nicht nötig ist.

## Ziele

- Drei freiwillige Angaben pro Person: Blutgruppe (0, A, B, AB), Rhesusfaktor (positiv, negativ) und Rhesusformel als Freitext wie im Pass, etwa „CcD.ee“.
- In den Einstellungen im Abschnitt „Profil“ unter Name und Geburtsdatum, gespeichert mit „Profil speichern“.
- Ein Hinweis, dass die Klinik vor einer Transfusion die Blutgruppe immer selbst bestimmt. Nützlich ist die Angabe zum Nachschauen, etwa beim Blutspenden oder in der Schwangerschaft.
- Die Angaben kommen in die Sicherung. Ältere Sicherungen ohne diese Felder bleiben lesbar.

## Nicht Teil dieser Änderung

- PC-Import und Übertragungsformat (die Übertragung enthält keine Personendaten).
- Ersteinrichtung, Übersicht, Erinnerungen.
- Prüfung der Rhesusformel auf gültige Schreibweisen. Sie wird nur von Leerzeichen am Rand befreit.

## Wege

1. Felder im Profil-Formular, gespeichert mit dem vorhandenen Knopf „Profil speichern“. Passt zu Name und Geburtsdatum im selben Abschnitt.
2. Eigener Abschnitt, der jede Änderung sofort speichert wie „Angaben zu dir“. Mischt beim Freitext zwei Speicherarten (Tippen sofort, Text beim Verlassen des Felds).

**Gewählt:** Weg 1 *(Festlegung Claude, folgt dem Vorschlag „bei Name und Geburtsdatum“)*.

## Festlegungen *(Claude)*

- Datenmodell: `Person` bekommt drei optionale Felder `bloodGroup?: "0" | "A" | "B" | "AB"`, `rhesus?: "positive" | "negative"`, `rhesusFormula?: string`. Fehlt ein Feld, gibt es keine Angabe. Keine neue Datenbankversion, IndexedDB speichert die Objekte, wie sie sind.
- Auswahl wie bei der FSME-Frage als Tipp-Gruppe (`ToggleGroup`). Ein zweiter Tipp auf die gewählte Schaltfläche hebt die Auswahl auf.
- Leere Rhesusformel wird nicht gespeichert.
- Sicherung: Das Personen-Schema nimmt die drei Felder optional auf. `BACKUP_VERSION` bleibt 1, weil ältere App-Versionen unbekannte Felder beim Lesen nur verwerfen und die PWA sich selbst aktualisiert. Eine unbekannte Blutgruppe in einer Sicherung gilt als beschädigt.

## Tests (mindestens)

- Sicherung: Personen mit den drei Feldern überstehen Speichern und Lesen; eine Sicherung ohne die Felder wird gelesen; Blutgruppe „C“ ergibt „corrupt“.
- Einstellungen: A, negativ und „CcD.ee“ wählen, speichern, gespeichert in der Datenbank; nach erneutem Öffnen ausgewählt; zweiter Tipp auf A und leeres Formelfeld entfernen die Angaben nach dem Speichern.
