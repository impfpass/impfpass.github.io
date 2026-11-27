# iPhone-Test von Plan 1 (Task 12, Step 6)

Datum: 27.11.2026
Gerät: iPhone mit iOS 27.2.1, Safari
Adresse: https://impfpass.github.io/ (Stand Commit 515bdb1)

| Schritt                                                                   | Ergebnis                                      |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| 1. Seite in Safari öffnen, Hinweis „zuerst zum Home-Bildschirm“ sichtbar  | klappt                                        |
| 2. Teilen → „Zum Home-Bildschirm“, App vom Home-Bildschirm starten        | klappt                                        |
| 3. Ersteinrichtung mit Name und Geburtsdatum                              | klappt                                        |
| 4. Impfung mit Impfstoff (Boostrix Polio) und eine nur mit Jahr eintragen | klappt                                        |
| 5. Alle vier Sortierungen ansehen                                         | klappt, mit einer Auffälligkeit (siehe unten) |
| 6. Sicherung über das Teilen-Menü in „Dateien“ speichern                  | klappt                                        |
| 7. Flugmodus an, App schließen und neu starten: App und Daten da          | klappt                                        |
| 8. Flugmodus aus                                                          | klappt                                        |

## Auffälligkeit

Bei der Sortierung nach Krankheit standen die Krankheiten in der Reihenfolge
der internen Krankheitsliste (Tetanus, Diphtherie, Keuchhusten, Polio …) und
nicht alphabetisch. Der Plan hatte diese Reihenfolge so vorgesehen, für die
Liste ist sie aber nicht nachvollziehbar.

Behoben in Commit fef589e: `groupByDisease` sortiert die Gruppen jetzt
alphabetisch nach dem deutschen Namen, wie es `groupByProduct` bei den
Impfstoffen schon tat. Der Test „Kombi-Impfstoff steht unter jeder seiner
Krankheiten, alphabetisch“ war vor der Änderung rot.

Die Übersicht („zuletzt geimpft“ je Krankheit) nutzt weiterhin die Reihenfolge
der Krankheitsliste. Das ist nicht geändert.
