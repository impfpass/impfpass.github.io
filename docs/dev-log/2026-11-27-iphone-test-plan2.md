# iPhone-Test von Plan 2 (Task 15, Step 5)

Datum: 27.11.2026
Gerät: iPhone, App vom Home-Bildschirm
Adresse: https://impfpass.github.io/ (zuerst Stand c7ac550, dann 3a2eba7)

| Schritt                                                   | Ergebnis                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| 1. Angaben in den Einstellungen ändern                    | zuerst nicht gespeichert, behoben in 3a2eba7 (siehe 1)     |
| 2. Farben der Übersicht im hellen und dunklen Design      | klappt, Design-Wechsel erst nach Neustart (siehe 2)        |
| 3. Karte „Mit dem Arzt besprechen“                        | Karten erscheinen ab 3a2eba7; Antwort nicht eigens geprüft |
| 4. „Möchte ich nicht“ und „Wieder anzeigen“               | klappt                                                     |
| 5. Häkchen bei „Beruf und Tierkontakt“ auf Höhe des Texts | klappt                                                     |

## 1. Angaben wurden ohne Knopfdruck nicht gespeichert

Nach dem Umlegen des Schalters „Ich habe eine chronische Erkrankung“
erschienen in der Übersicht keine Karten „Mit dem Arzt besprechen“. Die
Angaben wurden erst mit dem Knopf „Angaben speichern“ gesichert. Wer die
Seite vorher verließ, verlor die Änderung ohne Hinweis. Vorlauf und
Saison-Tag auf derselben Seite speichern dagegen sofort.

Behoben in Commit 3a2eba7: Die Angaben speichern jetzt bei jeder Änderung,
der Knopf ist weg. Scheitert das Speichern, erscheint ein Hinweis und das
Feld springt zurück. Danach erschienen auf dem iPhone die Karten.

## 2. Design-Wechsel am iPhone

Die App folgt dem hellen oder dunklen Design des Geräts. Wurde das Design am
iPhone umgestellt, während die App im Hintergrund lief, blieb sie im alten
Design. Nach dem vollständigen Schließen und neuen Öffnen stimmte es. Das
liegt an iOS bei Apps vom Home-Bildschirm, nicht an ImpfPass: Die Farben
hängen nur an `prefers-color-scheme` in `src/index.css`, ohne eigenen
Zustand in der App.

## Nachträge aus dem Test

Bei grünen Einträgen (geschützt) waren „Möchte ich nicht“ und „Nicht nötig“
in der Detailansicht überflüssig, weil gerade nichts ansteht. Dasselbe galt
für graue Einträge (später). Seit Commit 68dece3 stehen die Knöpfe nur noch
bei roten und gelben Einträgen und bei den Karten „Mit dem Arzt besprechen“.

Die Fundstelle bei RSV las sich als „Tab. 2, RSV, S, S. 18“. Seit Commit
ff95f21 schreiben die Fundstellen die STIKO-Kategorie aus, etwa
„Kategorie S“.

Beides auf dem iPhone geprüft (Stand ff95f21): klappt.
