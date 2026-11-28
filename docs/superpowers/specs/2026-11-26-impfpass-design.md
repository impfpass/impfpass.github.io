# ImpfPass: Design

Stand: 26.11.2026, vom Nutzer freigegeben am 26.11.2026.
Ablage: `C:\Dev\ImpfPass\docs\superpowers\specs\`, im künftigen Projektordner.

Kennzeichnung: Was der Auftraggeber (im Folgenden „der Nutzer“, er ist zugleich Betreuer des Projekts) selbst entschieden hat, steht ohne Zusatz. Was Claude festgelegt hat, ist mit *(Festlegung Claude)* markiert und kann vom Nutzer korrigiert werden.

## 1. Worum es geht

Der Papier-Impfpass des Nutzers ist voll und unübersichtlich. Er will eine App auf dem Handy, die

1. einmal mit allen Impfungen aus dem Papierpass befüllt wird,
2. den Impfstatus übersichtlich und nach verschiedenen Kriterien sortierbar zeigt, wenn er nachsehen will,
3. von selbst an Impfungen erinnert, auch wenn er nicht daran denkt und die App lange nicht öffnet.

Erinnert werden soll an drei Arten von fälligen Impfungen: Auffrischungen, Impfungen, die mit dem Alter dazukommen (etwa Gürtelrose ab 60), und Impfungen, die aus anderen Gründen neu empfohlen werden, zum Beispiel durch eine neue STIKO-Empfehlung, wie damals bei COVID-19. Fällt eine Empfehlung weg, verschwindet auch die Erinnerung.

Im Alltag ersetzt die App den Papierpass. Zum Impfen und auf Reisen mit vorgeschriebenen Impfungen nimmt man den Papierpass weiterhin mit.

Die App soll auch für Verwandte und Bekannte taugen („so eine App kann ja eigentlich jeder gebrauchen“), viele davon mit Android-Handys. Der Nutzer selbst hat ein iPhone.

Vorbild ist das Projekt https://github.com/Nockchlhas/Impfbuch (Web-App, Stand 20.11.2026). Es hat weitgehend gute STIKO-Regeln (veraltet sind die Gürtelrose-Impfung bei Grunderkrankung und die Altersgrenze der COVID-19-Auffrischung), aber keine Lizenz, Erinnerungen erst ab Erreichen einer Altersgrenze, nur Sortierung nach Datum, nur Handy-Layout und keinen Datenaustausch zwischen Geräten. Am 25.11.2026 wurde dort Issue #1 gestellt (Bitte um MIT-Lizenz, Frage nach Mitarbeit). Bisher ohne Antwort.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**

- Handy-App (Haupt-App): Impfungen anzeigen, sortiert nach Datum, nach Impfstoff oder nach Krankheit; neue Impfungen direkt eintragen; fällige und künftig fällige Impfungen nach STIKO anzeigen; neue oder geänderte STIKO-Empfehlungen als „Neu“ hervorheben; anzeigen, welcher STIKO-Stand verwendet wird.
- PC-App: einmaliger Import der alten Einträge pro Person. Ein KI-Chatbot liest die Fotos der Impfpass-Seiten, der Nutzer prüft und korrigiert das Ergebnis in einer großen, bearbeitbaren Tabelle und überträgt es aufs Handy.
- Erinnerungen des Nutzers landen als Kalender-Aktionen in seiner eigenen GTD-App (siehe Abschnitt 9). Dort sieht er sie, weil er die GTD-App ohnehin regelmäßig öffnet.
- Neue STIKO-Empfehlungen erreichen die App ohne Zutun der Anwender. Der Betreuer wird automatisch auf Änderungen der STIKO-Empfehlungen hingewiesen und aktualisiert die Regeln.
- Das Datenmodell ist von Anfang an für mehrere Personen ausgelegt (Familienprofile später), die Oberfläche zeigt vorerst genau eine Person.

**Nicht-Ziele**

- Kein Server für Gesundheitsdaten, kein Abgleich zwischen Geräten.
- Keine App im App Store oder bei Google Play.
- Keine dauerhafte Nutzung am PC. Die PC-App dient dem einmaligen Import.
- In Phase 1 *(Festlegung Claude)*: keine Erinnerungen für Anwender ohne GTD-App (Verwandte, Android), keine Familienprofile in der Oberfläche, kein Impfkalender für Kinder, keine Reiseimpf-Empfehlungen. Siehe Abschnitt 15.
- Keine Übersetzung. Die App folgt der deutschen STIKO und richtet sich an Menschen in Deutschland, die Oberfläche ist deutsch.

**Anti-Ziele** (wäre ein Fehlschlag, auch wenn alles technisch funktioniert)

- Gesundheitsdaten verlassen das Gerät, ohne dass der Anwender es bemerkt.
- Die App gibt falsche Empfehlungen. Deshalb sind die Regeln durch Tests abgesichert, und jede Empfehlung nennt ihren STIKO-Stand.

## 3. Rahmenbedingungen

- Eine Web-App kann sich auf dem iPhone weder selbst wecken noch eine Mitteilung für später einplanen. Unter Android ist es praktisch genauso. Daraus folgt die Entscheidung für die GTD-Übergabe (Abschnitt 4.2).
- Auf dem iPhone haben Web-Apps auf dem Home-Bildschirm einen eigenen Speicher, getrennt von Safari. Ein Link, der aus einer Web-App heraus geöffnet wird, landet in Safari. Das betrifft die QR-Übertragung (Abschnitt 8) und die GTD-Übergabe (Abschnitt 9).
- Ohne Lizenz darf der Code des Originals weder verändert noch weitergegeben werden. Die STIKO-Empfehlungen selbst sind frei.
- Gesundheitsdaten sind nach DSGVO besonders geschützt. Die App ist kostenlos, nicht kommerziell und Open Source und gibt Informationen, keine Diagnosen. Ein deutlicher Hinweis „ersetzt keine ärztliche Beratung“ gehört in die App. (Keine Rechtsberatung, Einschätzung aus dem Gespräch.)
- Der Nutzer pflegt das Projekt selbst mit Claude Code. Er hat bereits eine Next.js/React/TypeScript-App gebaut (seine GTD-App).

## 4. Lösungswege

### 4.1 Wo und wie gebaut wird

- **A: Im Original weiterbauen** (Pull Requests oder Fork). Schneller Start, weil STIKO-Regeln, Tests, Impfstoffliste und Foto-Import schon funktionieren. Aber: ohne Lizenz nicht möglich; bei Pull Requests müsste der Autor, nach eigener Aussage kein Entwickler, jede Änderung prüfen; die Oberfläche steckt in einer 64 KB großen Datei mit HTML in Textbausteinen, Speicher ist localStorage, es gibt ein Profil. Zweite App, Erinnerungsstufen, Regel-Versionen und QR-Import liefen auf einen Umbau fast der ganzen App hinaus.
- **B: Eigenes öffentliches Projekt mit eigenem Aufbau.** Zwei Web-Apps um einen gemeinsamen Kern. Mehr Arbeit am Anfang.

**Gewählt: B.** Der Umbau in A wäre so groß, dass vom Original vor allem Impfstoffliste und Regeln blieben, und die stehen bei B mit einer Lizenz genauso zur Verfügung. Kommt die MIT-Lizenz, dürfen Impfstoffliste, Namenserkennung, Regeln und Tests des Originals als Ausgangspunkt dienen, mit Urheberhinweis. Kommt sie nicht, werden Impfstoffliste und Regeln selbst aus den Primärquellen geschrieben (STIKO-Empfehlungen im Epidemiologischen Bulletin des RKI, Impfstoff-Zulassungen beim Paul-Ehrlich-Institut). Auf die Antwort wird nicht gewartet *(Festlegung Claude)*: Wer an Impfstoffliste oder Regeln arbeitet, prüft den Lizenzstand zu diesem Zeitpunkt.

### 4.2 Wie erinnert wird

Betrachtet wurden:

- **Erinnern beim Öffnen der App.** Scheidet aus, der Nutzer will die App gerade nicht regelmäßig öffnen.
- **Termine mit Alarm im Handykalender** (kein Server). Funktioniert für alles Vorhersehbare. Neue STIKO-Empfehlungen kommen so nicht an, der Kalender erfährt nicht, wenn ein Termin vereinbart ist, und unter Android ist das Einlesen umständlich. Ein Alarm erscheint nur kurz und wird leicht übersehen. Außerdem nutzt der Nutzer den iPhone-Kalender nicht.
- **Zwei Kalender**: persönlicher Kalender plus ein abonnierter, für alle gleicher Neuigkeiten-Kalender auf der Projektseite. Löst das Problem mit neuen STIKO-Empfehlungen ohne Server, die übrigen Schwächen bleiben.
- **Push-Mitteilungen über einen kleinen Weckdienst**, der nur Geräteadresse und nächsten Wecktag kennt; die App rechnet auf dem Gerät. Deckt alles ab, auch ein Zähler-Abzeichen auf dem App-Symbol. Braucht aber einen Dienst, den jemand betreibt.
- **Erinnerungen auf dem PC.** Eine Web-App am PC hat dieselbe Grenze. Ein installiertes Programm mit Aufgabenplanung erinnert nur am Schreibtisch, bräuchte Einträge vom Handy zurück (Abgleich) und auf jedem PC der Verwandten eine Installation.
- **App aus dem App Store.** Ausgeschlossen (Kosten, Apples Vorgabe, dass Gesundheits-Apps von Organisationen eingereicht werden sollen), und für neue STIKO-Empfehlungen bräuchte auch sie Push.
- **Übergabe an die GTD-App des Nutzers.** Der Nutzer führt Termine als Kalender-Aktionen in seiner eigenen GTD-App und schaut dort regelmäßig hinein. Überfällige Kalender-Aktionen stehen dort rot auf dem Dashboard, bis sie abgehakt sind.

**Gewählt: Übergabe an die GTD-App** für den Nutzer selbst. Erinnerungen für Anwender ohne GTD-App (Kalender oder Weckdienst, Android) folgen in Phase 2. Der Kern wird so gebaut, dass die fälligen Impfungen an verschiedene Ziele übergeben werden können: Phase 1 GTD, später Handykalender und gegebenenfalls Weckdienst.

## 5. Aufbau im Überblick

Ein Repository, zwei Web-Apps, ein gemeinsamer Kern. Gehostet auf GitHub Pages, die Handy-App unter `/`, die PC-App unter `/import/`.

Die App braucht eine eigene Domain (eigenen Origin) *(Festlegung Claude)*. Der Speicher des Browsers gehört zur Domain, nicht zum Pfad. Unter `<konto>.github.io/<projekt>/` teilten sich alle Pages-Projekte des Kontos, auch künftige, denselben Speicher und könnten die Impfdaten lesen. Außerdem darf sich die Adresse nach der ersten echten Nutzung nicht mehr ändern: Unter einer neuen Adresse öffnet jede installierte App leer, die Daten kämen nur über die Datensicherung hinüber. Name und Adresse stehen deshalb vor der ersten echten Nutzung fest (siehe unten).

```
Kern (gemeinsam)
  Impfstoff- und Krankheitsliste
  Namenserkennung (Handelsname, Freitext -> Impfstoff, Krankheiten)
  STIKO-Regeln mit Version und Änderungsliste
  Formate: Import-Datei, QR-Übertragung, Datensicherung, GTD-Übergabe
  Speicher (IndexedDB) mit Datenmodell und Migrationen
Handy-App            PC-App (Import)
```

Technik (von Claude vorgeschlagen, vom Nutzer bestätigt): React, TypeScript, Tailwind CSS und shadcn/ui wie in der GTD-App des Nutzers, damit er sich in vertrautem Gelände bewegt. Als Gerüst Vite statt Next.js: Die App braucht keinen Server, und für zwei getrennt installierbare Web-Apps ist ein statischer Vite-Build mit zwei Einstiegsseiten einfacher als ein statischer Next.js-Export. Service Worker und Manifest über `vite-plugin-pwa`. Tests mit Vitest. Deploy über GitHub Actions, die Tests müssen vor dem Deploy grün sein. Zur Laufzeit keine Anfragen an Dritte (keine externen Schriften, keine Analyse-Dienste), alle Bibliotheken werden mitgeliefert. Beide Apps bekommen je ein eigenes Manifest, damit sie getrennt installierbar sind: die Handy-App über „Zum Home-Bildschirm“, die PC-App in Edge oder Chrome. Lizenz des neuen Projekts: MIT.

Name: ImpfPass. Adresse: `https://impfpass.github.io/` für die Handy-App und `https://impfpass.github.io/import/` für die PC-App. Dafür legt der Nutzer die kostenlose GitHub-Organisation `impfpass` an. Das Repo heißt `impfpass.github.io`, damit die App an der Wurzel der Adresse liegt *(Festlegung Claude)*. „Impfbuch“ ist der Name des Originals.

## 6. Handy-App

### 6.1 Bildschirme

**Übersicht** (Startseite). Oben, falls vorhanden, der Hinweis auf neue STIKO-Empfehlungen und der Hinweis auf noch nicht ans GTD übergebene Erinnerungen. Darunter fällige und demnächst fällige Impfungen, dann der Rest. Unten der verwendete STIKO-Stand.

```
┌──────────────────────────────────┐
│ Neu: Die STIKO empfiehlt seit    │
│ 01/2027 … Betrifft dich. [Ansehen]│
│ 2 Erinnerungen noch nicht im GTD │
│                [Ins GTD übernehmen]│
├──────────────────────────────────┤
│ Fällig                           │
│ ● Gürtelrose, 1. Dosis  ab 03/2027│
│   Termin ausmachen ab 09/2026    │
│ ● Grippe        Herbst 2027      │
│ Geschützt                        │
│   Tetanus/Diphtherie  bis 2032   │
│   Masern            lebenslang   │
├──────────────────────────────────┤
│ STIKO-Stand: Epid. Bull. x/2026  │
│ [Übersicht] [Impfungen] [+] [⚙] │
└──────────────────────────────────┘
```

**Impfungen**. Liste aller Einträge, umschaltbar:
- nach Datum (neueste oder älteste zuerst),
- nach Impfstoff (Handelsname, darunter die Termine),
- nach Krankheit (je Krankheit die Impfungen, die sie abdecken, und der Schutzstatus; ein Kombi-Impfstoff erscheint unter jeder seiner Krankheiten).

Die gewählte Sortierung bleibt gespeichert. Ein Eintrag öffnet die Detailansicht mit Bearbeiten und Löschen.

**Neue Impfung** (+). Datum (vorbelegt mit heute), Impfstoff mit Vorschlägen aus der Impfstoffliste, Freitext möglich, dann Krankheiten von Hand wählen. Charge, Arzt oder Praxis, Notiz. Die Krankheiten ergeben sich aus dem Impfstoff und werden angezeigt. Nach dem Speichern bietet die App eine Datensicherung an und, falls sich Erinnerungen geändert haben, die Übergabe ans GTD.

**Empfehlung im Detail** (aus der Übersicht). Was empfohlen ist, warum (Alter, Auffrischung, Indikation), ab wann, welcher STIKO-Stand, seit wann die Empfehlung gilt. Aktionen: „Möchte ich nicht“ (blendet die Empfehlung und ihre Erinnerungen aus, umkehrbar) und „Nicht nötig“ mit Grund, etwa „Erkrankung durchgemacht“ oder „Immunität per Bluttest belegt“ *(Festlegung Claude)*.

**Einstellungen**. Profil (Name, Geburtsdatum, Angaben für Indikationsimpfungen, Abschnitt 7.2), Vorlauf für Erinnerungen (Standard 6 Monate, einstellbar), Tag für Saison-Erinnerungen (Standard 1. September), GTD-Übergabe (Adresse der GTD-App; ohne Adresse ist die Funktion ausgeblendet), Import (QR-Code scannen, Datei öffnen), Datensicherung und Wiederherstellung, Info (STIKO-Stand, Quellen, Hinweis „ersetzt keine ärztliche Beratung“, Datenschutz, Urheberhinweis auf das Original, falls Code übernommen wurde).

### 6.2 Ersteinrichtung

Beim ersten Start: Name und Geburtsdatum, die Angaben für Indikationsimpfungen, dann die Wahl „Alte Impfungen vom PC übernehmen“ (mit der Adresse der PC-App und kurzer Anleitung) oder „Einträge selbst eingeben“. Die App fordert dauerhaften Speicher an, wo der Browser das unterstützt, und empfiehlt, sie zum Home-Bildschirm hinzuzufügen.

## 7. Regeln und Empfehlungen

### 7.1 Umfang in Phase 1

Erwachsene ab 18 Jahren *(Festlegung Claude)*, Standard- und Indikationsimpfungen nach aktueller STIKO-Empfehlung, mindestens: Tetanus, Diphtherie, Keuchhusten, Polio, Masern/Mumps/Röteln, Windpocken, HPV (Nachholen), Hepatitis B, Pneumokokken, Grippe, COVID-19, Gürtelrose, RSV, FSME. Nachholimpfungen bei unvollständiger Grundimmunisierung gehören dazu. Reiseimpfungen werden erkannt, angezeigt und gespeichert (Gelbfieber steht oft im Pass), aber nicht empfohlen.

Welche Empfehlung genau gilt, leitet der Builder aus den Primärquellen ab, nicht aus diesem Dokument und nicht ungeprüft aus dem Original.

### 7.2 Angaben zur Person

Neben dem Geburtsdatum gibt es zwei Arten von Angaben: solche, die man selbst beantworten kann (FSME, Beruf), und eine, bei der der Arzt entscheiden muss (chronische Erkrankung). Schwangerschaft wird in Phase 1 nicht berücksichtigt.

**Chronische Erkrankung: mit dem Arzt klären.** Bei fünf Impfungen empfiehlt die STIKO Erwachsenen mit Grunderkrankung früher zu impfen als allen anderen. Stand November 2026, aus Fachmedien, vom Builder an der Primärquelle zu prüfen: Grippe (für alle ab 60, mit Grunderkrankung in jedem Alter), COVID-19 (ab 75 bzw. jedes Alter, Änderung vom Juli 2026), Pneumokokken (ab 60 bzw. ab 18), Gürtelrose (ab 60 bzw. ab 18, Änderung vom November 2025), RSV (ab 75 bzw. 60 bis 74). Dazu kommen Impfungen, die Erwachsene nur bei bestimmten Erkrankungen bekommen, etwa Hepatitis B. Die STIKO entscheidet dabei weniger nach dem Organ als nach der Schwere („schwere Ausprägungen“ bei Gürtelrose, „relevant beeinträchtigende Grunderkrankung“ bei RSV). Das kann eine Liste zum Ankreuzen nicht abbilden.

Deshalb gibt es einen Schalter „chronische Erkrankung“. Ist er an, zeigt die App für jede betroffene Impfung eine eigene Karte „Mit dem Arzt besprechen“. Sie nennt die normale Empfehlung und die Zielgruppe, wie die STIKO sie beschreibt, und hat drei Antworten:

- „Arzt empfiehlt sie mir“: Aus der Karte wird eine normale Empfehlung, fällig nach dem Schema der Impfung (meist sofort), mit Erinnerung im GTD.
- „Trifft nicht zu“: Die Karte verschwindet, die normale Empfehlung nach Alter bleibt.
- „Noch offen“: Die Karte bleibt.

Alle offenen Karten gehen gesammelt als eine einzige Aktion ins GTD: „Beim nächsten Arztbesuch fragen: Gürtelrose schon jetzt? Pneumokokken schon jetzt?“ (eine `ref` für diese Sammelaktion, die bei Änderungen aktualisiert und nach der letzten Antwort zurückgezogen wird). Geändert mit Plan 4 (Entscheidung 6 des Nutzers): Die `ref` hängt an der Menge der offenen Fragen. Ändert sich die Menge, kommt eine neue Aktion, die alte wird zurückgezogen, weil die GTD-App eine abgehakte Aktion nicht mehr aktualisiert. Die Antworten speichert die App mit Datum. Sie lassen sich jederzeit ändern. Ist der Schalter aus, gelten nur die Empfehlungen nach Alter. In der Übersicht steht dann nichts dazu, nur die Detailansicht der Impfung sagt in einem Satz, dass die STIKO sie bei bestimmten Erkrankungen früher empfiehlt.

**FSME: selbst beantworten** *(Festlegung Claude)*. Frage: „Hältst du dich in FSME-Risikogebieten im Freien auf, zu Hause oder im Urlaub (Garten, Wald, Wandern)?“ Mit Erklärung und Link zur Risikogebiets-Karte des RKI. Bei Ja gilt die FSME-Impfung als volle Empfehlung mit Erinnerung: Grundimmunisierung, dann Auffrischungen in Abständen, die vom Impfstoff und vom Alter abhängen. Stehen im Pass FSME-Impfungen, die Frage ist aber mit Nein beantwortet oder offen, fragt die App einmal nach, ob sie an Auffrischungen erinnern soll. Eine Auswahl des eigenen Landkreises anhand der jährlichen RKI-Liste der Risikogebiete ist für später vorgesehen.

**Beruf: selbst beantworten** *(Festlegung Claude)*. Statt eines Schalters „Gesundheitswesen“ wenige Ja-Nein-Fragen zur Tätigkeit, weil die STIKO je nach Tätigkeit verschiedene Impfungen empfiehlt:

- Arbeit mit Patienten oder Pflegebedürftigen,
- Arbeit in einer Kita, Schule oder anderen Gemeinschaftseinrichtung,
- Kontakt mit Blut oder anderen Körperflüssigkeiten (auch Rettungsdienst, Polizei),
- regelmäßiger direkter Kontakt zu Geflügel, Schweinen, Wildvögeln oder ähnlichen Tieren, beruflich oder privat.

Der Builder ordnet jede Frage anhand der STIKO-Tabelle zu den beruflichen Indikationen den Impfungen zu (etwa zweite Masern-Impfung, Keuchhusten-Auffrischung, jährliche Grippe-Impfung, Hepatitis B). Das sind volle Empfehlungen mit Erinnerung. Die App weist darauf hin, dass für berufliche Impfungen meist der Betriebsarzt zuständig ist und der Arbeitgeber zahlt. Was erst ein Bluttest klären muss (etwa Windpocken bei unklarer Immunität), läuft wie bei der chronischen Erkrankung über eine Karte „Mit dem Arzt besprechen“.

### 7.3 Regelbaustein

Die Regeln sind ein eigener Baustein im Kern, reine Funktionen ohne Zugriff auf Speicher oder Oberfläche:

```
auswerten(person, impfungen, entscheidungen, heute, regelwerk) -> empfehlungen[]
```

Jede Empfehlung hat eine stabile Kennung (etwa `zoster`), die betroffenen Krankheiten, einen Status (geschützt, demnächst fällig, fällig, überfällig, künftig, mit dem Arzt besprechen, nicht zutreffend, abgelehnt, nicht nötig), das Fälligkeitsdatum, die nächste Dosis bei Serien, die Art des Zeitpunkts (normal, Saison, Folgedosis), eine Begründung in Klartext und die Fundstelle im STIKO-Text.

Anders als im Original liefert der Baustein auch künftige Fälligkeiten, die erst mit einer Altersgrenze entstehen: Für einen 59-Jährigen kommt Gürtelrose mit Fälligkeit am 60. Geburtstag zurück, nicht „nicht zutreffend“.

Bei Einträgen mit unsicherem oder unvollständigem Datum (nur Monat oder Jahr bekannt) rechnen die Regeln mit dem frühestmöglichen Datum, damit eher zu früh als zu spät erinnert wird *(Festlegung Claude)*.

Das Regelwerk trägt eine Version (Datum plus laufende Nummer), den STIKO-Stand (Ausgabe des Epidemiologischen Bulletins) und eine Änderungsliste. Jeder Eintrag der Änderungsliste nennt die betroffenen Empfehlungs-Kennungen, das Datum „gilt seit“ und einen kurzen Text für den Hinweis „Neu“.

### 7.4 Neue und geänderte Empfehlungen erkennen

Die App speichert pro Person die zuletzt gesehene Regelwerk-Version und einen Schnappschuss der Auswertung (Kennung, Fälligkeitsdatum, Dosis je Empfehlung). Den Schnappschuss speichert sie nach jeder Änderung der eigenen Daten (Eintrag, Profil, Entscheidung) mit dem aktuellen Regelwerk neu, damit ein Unterschied beim Versionswechsel nur von den Regeln kommen kann *(Festlegung Claude)*. Verglichen werden Vorhandensein, Fälligkeitsdatum und Dosis, nicht der Status, der sich mit der Zeit von selbst ändert. Bei Saison-Impfungen zählt nur das Vorhandensein, weil ihr Datum jedes Jahr weiterrückt. Ist die mitgelieferte Version neuer, wertet die App neu aus und vergleicht:

- neu zutreffend: Hinweis „Neu: Die STIKO empfiehlt seit … “ mit dem Text aus der Änderungsliste,
- geändert (anderes Datum, andere Dosis): Hinweis „Geändert“,
- weggefallen: Hinweis „Entfällt“, die Erinnerung wird zurückgezogen (Abschnitt 9.4).

Verglichen wird nur bei einem Versionswechsel. Was sich durch das Älterwerden ändert, ist kein „Neu“, weil es als künftige Fälligkeit schon vorher sichtbar war. Nach dem Bestätigen speichert die App Version und Schnappschuss neu. Die neue Regelwerk-Version kommt mit jeder neuen App-Version an, sobald die App mit Internetverbindung gestartet wird.

### 7.5 Regeln aktuell halten

- Ein GitHub-Workflow läuft monatlich und auf Knopfdruck. Er lädt die RKI-Seiten mit den aktuellen STIKO-Empfehlungen und die Übersicht des Epidemiologischen Bulletins, zieht den Haupttext heraus, vergleicht ihn mit dem zuletzt gespeicherten Stand und eröffnet bei einer Änderung ein Issue im Projekt-Repo. GitHub benachrichtigt den Betreuer darüber.
- Zusätzlich *(Festlegung Claude, optional)*: Der Workflow legt einen Eintrag in der Inbox der GTD-App an („STIKO-Seiten geändert, ImpfPass-Regeln prüfen“). Dafür gibt es in der GTD-App schon `POST /api/inbox` mit Bearer-Token. Adresse und Token liegen als Secrets im Repo. Der Eintrag enthält keine persönlichen Daten.
- Der Betreuer aktualisiert die Regeln mit Claude Code: Regeln, Änderungsliste und Tests anpassen, Tests grün, Deploy. Die `CLAUDE.md` des Projekts beschreibt diesen Ablauf Schritt für Schritt.
- Wie der gespeicherte Vergleichsstand fortgeschrieben wird, entscheidet der Builder. Ziel: eine Meldung pro Änderung, keine Dauermeldungen bei unveränderter Seite, keine Fehlalarme durch Layout-Änderungen.

## 8. PC-App und Übertragung aufs Handy

### 8.1 Ablauf am PC

1. Der Anwender fotografiert die Seiten seines Impfpasses und bringt die Fotos auf den PC (auf welchem Weg, ist seine Sache).
2. Die PC-App zeigt eine kopierbare Anleitung für den Chatbot (Claude, ChatGPT oder andere), samt genauem Ausgabeformat. Davor ein deutlicher Hinweis, dass die Fotos beim Anbieter des Chatbots landen, mit dem Tipp, dort die Verwendung für Training abzuschalten, wo das geht.
3. Der Anwender lädt die Fotos beim Chatbot hoch und fügt die Antwort in die PC-App ein.
4. Die PC-App liest die Antwort, ordnet Namen der Impfstoffliste zu und zeigt eine große, bearbeitbare Tabelle: Datum, Impfstoff (mit Vorschlägen), abgedeckte Krankheiten, Charge, Arzt, Notiz, Prüfhinweis. Markiert werden: Impfstoff nicht erkannt oder mehrdeutig, Datum fehlt, liegt in der Zukunft oder vor dem Geburtsdatum, Krankheit unklar, mögliche Dubletten (gleiches Datum und überlappende Krankheit). Zeilen lassen sich hinzufügen und löschen. So geht auch die reine Handeingabe am großen Bildschirm, ganz ohne Chatbot.
5. Ist alles geprüft, erzeugt die PC-App die Übertragung (8.2). Der Entwurf bleibt bis dahin im Browser gespeichert, damit man die Arbeit unterbrechen kann. Nach der Übertragung bietet die App an, den Entwurf zu löschen.

Das Ausgabeformat des Chatbots *(Festlegung Claude)*: JSON nach dem Muster des Originals (`{"impfpass":"import","vaccinations":[{"date":"05.12.2016","name":"Boostrix Polio","batch":"…","doctor":"…"}]}`), erweitert um ein Feld für unsicher gelesene Angaben und um `diseases` als Rückfall, wenn kein Handelsname lesbar ist. Die Anleitung bittet den Chatbot, Nicht-Impfungen (etwa Tuberkulintests) wegzulassen und Unleserliches zu markieren statt zu raten. Die PC-App nimmt auch leicht abweichende Antworten an (Text um das JSON herum, Codeblöcke).

Zum Geburtsdatum: Die PC-App fragt es optional ab, nur für die Plausibilitätsprüfung. Es wird nicht übertragen; das Profil entsteht auf dem Handy *(Festlegung Claude)*.

### 8.2 Übertragung

- Hauptweg: QR-Codes. Die Einträge werden kompakt kodiert, komprimiert und auf einen oder mehrere Codes verteilt. Bei 25 bis 50 Einträgen sind das ein bis drei Codes. Die PC-App zeigt sie nacheinander oder nebeneinander, das Handy scannt sie in beliebiger Reihenfolge und zeigt den Fortschritt („2 von 3“). Jeder Teil trägt Formatkennung, Version, Teilnummer, Gesamtzahl und eine Prüfsumme über das Ganze.
- Gescannt wird in der Handy-App selbst, mit der Kamera über den Browser. Die Kamera-App des iPhones scheidet aus: Ein Link aus einem QR-Code öffnet Safari, und Safari hat einen anderen Speicher als die Web-App auf dem Home-Bildschirm.
- Ersatzweg: Die PC-App speichert eine Datei, die per E-Mail, AirDrop oder Cloud aufs Handy kommt und dort über „Datei öffnen“ eingelesen wird. Dazu kommt Kopieren und Einfügen des Textes.
- Vor dem Übernehmen zeigt das Handy eine Vorschau. Übernommen wird durch Zusammenführen mit den vorhandenen Einträgen. Dubletten nach derselben Regel wie in 8.1 werden angezeigt und standardmäßig nicht doppelt übernommen.

Größe pro Code, Kodierung (etwa deflate plus Base45 oder Byte-Modus) und Bibliotheken wählt der Builder. Vorgabe: Die Codes müssen sich vom PC-Bildschirm mit einem durchschnittlichen Handy zuverlässig scannen lassen.

## 9. Erinnerungen über die GTD-App

### 9.1 Zeitpunkte

Für jede zutreffende Empfehlung mit Fälligkeitsdatum berechnet der Kern einen Erinnerungstag („Termin beim Arzt ausmachen“):

- normal: Fälligkeitsdatum minus Vorlauf (Standard 6 Monate, einstellbar), weil viele Praxen lange Wartezeiten haben,
- Saison-Impfungen (Grippe, COVID-19, RSV): der eingestellte Saison-Tag (Standard 1. September) vor der jeweiligen Saison,
- Folgedosen einer Serie (etwa die zweite Gürtelrose-Dosis 2 bis 6 Monate nach der ersten): frühestmöglicher Termin der Folgedosis minus 4 Wochen *(Festlegung Claude)*,
- liegt der berechnete Tag in der Vergangenheit (überfällig, neu empfohlen, schon im Vorlauf): heute.

Eine monatliche Wiederholung gibt es nicht. In der GTD-App bleibt eine nicht erledigte Kalender-Aktion rot auf dem Dashboard stehen, bis sie abgehakt ist.

Übergeben werden alle bekannten Erinnerungen, auch weit in der Zukunft liegende (etwa die Tetanus-Auffrischung in sechs Jahren), damit nichts davon abhängt, dass die App wieder geöffnet wird. Saison-Erinnerungen werden für die nächsten drei Saisons übergeben *(Festlegung Claude)*, sonst käme nach einem ausgelassenen Jahr nichts mehr.

Den Arzttermin selbst trägt der Nutzer wie jeden anderen Termin in seiner GTD-App ein. Danach trägt er die Impfung in ImpfPass ein. Die übergebene Aktion führt ihn mit einer Checkliste durch diese Schritte:

```
Titel:        Gürtelrose-Impfung (1. Dosis): Termin beim Arzt ausmachen
Datum:        01.09.2026
Beschreibung: Fällig ab 01.03.2027 (60. Geburtstag) laut STIKO, Stand Epid. Bull. x/2026.
Checkliste:   [ ] Termin beim Arzt ausmachen
              [ ] Termin als Kalender-Aktion eintragen, Impfpass mitnehmen
              [ ] Nach der Impfung in ImpfPass eintragen
```

### 9.2 Ablauf in ImpfPass

- In den Einstellungen trägt der Nutzer die Adresse seiner GTD-App ein. Die Adresse steht nicht im Code und nicht im öffentlichen Repo.
- Die App merkt sich je Person, welche Erinnerungen in welcher Fassung übergeben wurden. Unterscheidet sich der aktuelle Stand davon (neue Erinnerung, geänderte, weggefallene), zeigt die Übersicht „n Erinnerungen noch nicht im GTD“.
- „Ins GTD übernehmen“ bietet zwei Wege: einen Link öffnen oder einen Text kopieren, der in der GTD-App eingefügt wird. Der Link passt am PC, Kopieren und Einfügen auf dem iPhone, wo der Link in Safari statt in der GTD-App vom Home-Bildschirm landen würde.
- Ein auf heute vorgezogener Erinnerungstag zählt beim Vergleich mit dem Übergabe-Stand als „sofort“, nicht als Datum, und wird mit dem Tag der Übergabe übergeben *(Festlegung Claude)*. Sonst sähe die Erinnerung jeden Tag geändert aus, und die App meldete täglich „noch nicht im GTD“. Umgesetzt in Plan 4 (Entscheidung 4): Verglichen wird der berechnete Erinnerungstag, bevor er auf heute vorgezogen wird. Das hat denselben Zweck, und eine Erinnerung gilt auch nicht als geändert, nur weil ihr Tag seit der Übergabe vorbei ist.
- Als übergeben gilt eine Erinnerung, sobald der Nutzer die Übergabe ausgelöst hat. Eine Rückmeldung der GTD-App gibt es nicht. Wiederholtes Übergeben schadet nicht, weil die GTD-App doppelte Einträge erkennt (9.4).
- Erinnerungen berechnet und übergibt nur die Handy-App, weil nur dort Profil, Entscheidungen und der Übergabe-Stand liegen *(Festlegung Claude)*. Die erste Übergabe geschieht also nach dem Import auf dem Handy, auf dem iPhone per Kopieren und Einfügen in die GTD-App vom Home-Bildschirm. Später übergibt der Nutzer, wenn sich etwas geändert hat.

### 9.3 Übergabeformat (Version 1)

```json
{
  "format": "impfpass-gtd",
  "version": 1,
  "created": "2026-11-26T14:00:00Z",
  "items": [
    { "ref": "ip-7f3a9c21d4e8b605", "op": "upsert",
      "title": "Gürtelrose-Impfung (1. Dosis): Termin beim Arzt ausmachen",
      "date": "2026-09-01", "time": null,
      "description": "Fällig ab 01.03.2027 …",
      "checklist": ["Termin beim Arzt ausmachen", "…", "…"] },
    { "ref": "ip-0c55e2a9b1f47d38", "op": "cancel" }
  ]
}
```

- `ref`: stabile, undurchsichtige Kennung, gebildet als Hash aus Personen-Kennung, Empfehlungs-Kennung, Dosis und Fälligkeitsdatum. Sie verrät nichts über die Impfung und darf deshalb unverschlüsselt gespeichert werden. Ändert sich das Fälligkeitsdatum, entsteht eine neue `ref`, und die alte wird mit `cancel` zurückgezogen.
- `op`: `upsert` legt an oder aktualisiert, `cancel` zieht zurück.
- Transport als Link: JSON, UTF-8, komprimiert, Base64url, im Fragment der Adresse (`<GTD-Adresse>/<Übernahmeseite>#impfpass=<daten>`). Das Fragment schickt der Browser nicht an den Server, die Daten tauchen also in keinem Server-Log auf. Umgesetzt in Plan 4: gepackt mit raw DEFLATE (RFC 1951, ohne zlib-Kopf), Base64url ohne `=`; in den Einstellungen steht die volle Adresse der Übernahmeseite.
- Transport als Text: dieselben Daten mit Präfix `IMPFPASS-GTD:1:`.

ImpfPass erzeugt dieses Format und testet es. Wie die GTD-App es verarbeitet, ist Sache des GTD-Projekts.

### 9.4 Anforderungen an die GTD-App (eigene Umsetzung im GTD-Repo)

Diese Arbeit gehört ins Repo `C:\Dev\GettingThingsDone` und bekommt dort einen eigenen Plan. Mindestens:

- Eine Übernahmeseite, die Daten aus dem Fragment oder aus eingefügtem Text liest, eine Vorschau zeigt und nach Bestätigung handelt. Kommt der Nutzer über die Anmeldung, dürfen die Daten nicht verloren gehen, sonst bleibt ihm das Einfügen.
- `upsert`: legt eine Kalender-Aktion an (`type='calendar'`, `scheduled_date`, optional `scheduled_time`, Titel, Beschreibung, Checklisten-Punkte), verschlüsselt wie jede andere Aktion mit dem persönlichen Schlüssel. Gibt es zur `ref` schon eine aktive Aktion, wird sie aktualisiert. Hat ImpfPass sie mit `cancel` zurückgezogen, wird sie wiederhergestellt (wieder aktiv) und aktualisiert. Hat der Nutzer sie selbst erledigt oder gelöscht, bleibt sie unberührt.
- `cancel`: Eine aktive Aktion mit dieser `ref` wird als erledigt markiert oder in den Papierkorb gelegt (entscheidet das GTD-Projekt) und als „von ImpfPass zurückgezogen“ vermerkt, sonst passiert nichts.
- Warum der Vermerk nötig ist (ergänzt am 28.11.2026, vom Nutzer entschieden, Plan 4): Die `ref` ist fest. Kommt eine zurückgezogene Erinnerung wieder, etwa nach „Möchte ich nicht“ und „Wieder anzeigen“, nach einer versehentlich gelöschten und neu eingetragenen Impfung oder nach einer geänderten Arzt-Antwort, schickt ImpfPass dieselbe `ref` erneut. Ohne Vermerk bliebe sie im GTD erledigt, und die Erinnerung ginge still verloren. Der Vermerk liegt im GTD, nicht in ImpfPass, und gilt deshalb auch nach einer Wiederherstellung von ImpfPass aus der Sicherung.
- Die `ref` und der Vermerk werden unverschlüsselt gespeichert, damit Dubletten ohne Entschlüsseln erkannt werden, etwa in neuen Spalten.
- Nicht über `POST /api/inbox`: ImpfPass bräuchte dafür den API-Schlüssel, die Texte lägen bis zum nächsten Entsperren unverschlüsselt in der Datenbank, und Inbox-Einträge haben kein Datum.

## 10. Datenmodell

Gespeichert in IndexedDB mit Schema-Version und Migrationen *(Festlegung Claude)*. Gründe: robuster und größer als localStorage, und ein späterer Weckdienst könnte im Service Worker auf IndexedDB zugreifen, auf localStorage nicht.

```
Person        id, name, geburtsdatum, angelegt,
              angaben {chronischKrank, fsme (ja|nein|offen),
                       beruf {patienten, gemeinschaftseinrichtung, blutkontakt, tierkontakt}}
Impfung       id, personId, datum, datumGenauigkeit (tag|monat|jahr), impfstoffId | null,
              bezeichnung (wie im Pass), krankheiten[], charge?, arzt?, notiz?,
              quelle (manuell|import), importId?, angelegt, geaendert
Entscheidung  personId, empfehlungId,
              art (abgelehnt|nicht_noetig|arzt_empfiehlt|arzt_trifft_nicht_zu), grund?, am
RegelStand    personId, gesehenVersion, schnappschuss[]
GtdStand      personId, uebergeben [{ref, inhaltsHash, am}]
Einstellungen vorlaufMonate (6), saisonTag ("09-01"), gtdAdresse?, sortierung, letzteSicherung?
```

Die Oberfläche zeigt in Phase 1 genau eine Person. Alles, was sich auf eine Person bezieht, trägt trotzdem die `personId`.

## 11. Impfstoffliste und Namenserkennung

- Die Liste enthält Krankheiten und Impfstoffe mit Handelsnamen, Schreibvarianten, abgedeckten Krankheiten und, wo bekannt, Zulassungszeitraum. Sie umfasst auch ältere und nicht mehr erhältliche Impfstoffe, weil die in alten Pässen stehen, und Reiseimpfstoffe.
- Die Namenserkennung ordnet gelesene Namen unscharf zu (Groß- und Kleinschreibung, Leerzeichen, Tippfehler, typische Lesefehler). Ist die Zuordnung unsicher oder mehrdeutig, wird markiert statt geraten.
- Handy-App und PC-App nutzen dieselbe Liste und dieselbe Erkennung aus dem Kern.

## 12. Speicher, Datensicherung, Datenschutz

- Alle Daten bleiben auf dem Gerät. Daten verlassen es nur, wenn der Anwender es ausdrücklich auslöst: Fotos an den Chatbot, QR-Übertragung oder Datei, GTD-Übergabe, Datensicherung. Die App nennt jeweils, wohin die Daten gehen.
- Nach jedem neuen oder geänderten Eintrag bietet die App an, eine Sicherung zu speichern (JSON-Datei, auf dem iPhone über das Teilen-Menü etwa in „Dateien“ oder iCloud Drive). Die Wiederherstellung ersetzt nach Rückfrage alle Daten. Zum Zusammenführen dient der Import.
- Die App fordert dauerhaften Speicher an, wo der Browser das unterstützt. Die Sicherung bleibt das eigentliche Netz.
- Keine Analyse-Dienste, keine Anfragen an Dritte zur Laufzeit, eine strikte Content-Security-Policy.

## 13. Tests und Qualität

- Regeln: pro Empfehlung Testfälle mit Beispielpersonen, ausdrücklich an den Grenzen (Tag vor und am 60. Geburtstag, Ablauf genau nach 10 Jahren, Serien mit Mindest- und Höchstabstand, unvollständige Daten, Ablehnungen). Jeder Test nennt die STIKO-Fundstelle. Bei jeder Regeländerung kommen Tests für den neuen Stand dazu.
- „Neu“-Erkennung: Testfälle mit zwei Regelwerk-Versionen (hinzugekommen, geändert, weggefallen).
- Erinnerungstage: normal, Saison, Folgedosis, Vergangenheit, geänderter Vorlauf.
- Formate: Hin- und Rückweg für Import-Antworten (auch unsaubere), QR-Teile (Reihenfolge, fehlender Teil, falsche Prüfsumme), GTD-Übergabe (stabile `ref`, `cancel` bei geändertem Datum), Datensicherung.
- Zusammenführen und Dubletten-Erkennung.
- Die CI führt alle Tests vor jedem Deploy aus. Schlägt einer fehl, wird nicht veröffentlicht.
- Vor der Freigabe ein Durchlauf auf einem echten iPhone: Home-Bildschirm, Kamera-Scan der QR-Codes, Teilen-Menü bei der Sicherung, Kopieren für die GTD-Übergabe.

## 14. Vorgaben für das Projekt

- Öffentliches Repo `impfpass.github.io` in der GitHub-Organisation `impfpass`, MIT-Lizenz, README mit Zweck, Hinweis „ersetzt keine ärztliche Beratung“ und, falls Code aus dem Original übernommen wird, Urheberhinweis.
- `CLAUDE.md` mit Aufbau, Konventionen und dem Ablauf für Regel-Updates.
- Oberfläche auf Deutsch, Texte an einer Stelle gesammelt, damit Begriffe einheitlich bleiben.
- Gut lesbar auch für ältere Anwender (ausreichende Schriftgröße, klare Kontraste, große Bedienflächen), helles und dunkles Design.

## 15. Phasen

- **Phase 1 (dieses Design):** Handy-App, PC-App, Kern mit Regeln für Erwachsene, QR-Übertragung, Datensicherung, „Neu“-Erkennung, GTD-Übergabe auf Seite von ImpfPass, STIKO-Wächter, CI und Deploy. Getrennt davon im GTD-Repo: die Übernahmeseite (9.4). Erster echter Test des PC-Imports: der Papierpass des Nutzers.
- **Phase 2:** Erinnerungen für Anwender ohne GTD-App, auch unter Android. Zur Wahl stehen Handykalender (mit Neuigkeiten-Kalender) und Push-Weckdienst mit Zähler auf dem App-Symbol. Wird entschieden, wenn es so weit ist.
- **Später:** Familienprofile in der Oberfläche, Impfkalender für Kinder, Schwangerschaft, Reiseimpf-Empfehlungen.

## 16. Offen

Keine offenen Fragen an den Nutzer. Name und Adresse stehen in Abschnitt 5.
## 17. Dem Builder überlassen

Bibliotheken für QR-Erzeugung, QR-Scan, Kompression und IndexedDB; genaue Kodierung und Größe der QR-Teile; Algorithmus der unscharfen Namenserkennung; Ordnerstruktur und Dateinamen; Update-Verhalten des Service Workers; genaue RKI-Adressen und Textauswahl für den STIKO-Wächter und wie sein Vergleichsstand fortgeschrieben wird; visuelle Gestaltung im Rahmen der Skizzen; Auswahl weiterer Testfälle über die genannten hinaus.

## 18. Festlegungen von Claude (zum Prüfen)

1. React, TypeScript, Tailwind, shadcn/ui und Vitest wie in der GTD-App, aber Vite statt Next.js (vom Nutzer bestätigt), gehostet auf GitHub Pages unter eigener Domain.
2. Nicht auf die Lizenz des Originals warten; Lizenzstand prüfen, wenn Impfstoffliste und Regeln an der Reihe sind.
3. Phase 1 ohne Erinnerungen für Anwender ohne GTD, ohne Kinder, Reise-Empfehlungen und Schwangerschaft.
4. Regeln für Erwachsene ab 18. FSME als eigene Frage mit einmaliger Nachfrage, wenn der Pass FSME-Impfungen enthält; Beruf als vier Fragen zur Tätigkeit statt eines Schalters „Gesundheitswesen“; offene Arztfragen als eine Sammelaktion im GTD. (Vom Nutzer entschieden: chronische Erkrankung über Karten „Mit dem Arzt besprechen“.)
5. Unsichere Daten: Regeln rechnen mit dem frühestmöglichen Datum.
6. „Möchte ich nicht“ und „Nicht nötig“ (mit Grund) als Entscheidungen zu einer Empfehlung.
7. Folgedosen: Erinnerung 4 Wochen vor dem frühestmöglichen Termin.
8. Alle bekannten Erinnerungen werden übergeben, Saison-Erinnerungen für drei Saisons.
9. Nur die Handy-App berechnet und übergibt Erinnerungen, auch die erste Übergabe nach dem Import.
10. Übergabe als Link oder als kopierbarer Text, `ref` als undurchsichtiger Hash.
11. Optionaler Eintrag des STIKO-Wächters in der GTD-Inbox.
12. Geburtsdatum in der PC-App nur zur Prüfung, nicht übertragen.
13. IndexedDB statt localStorage.
14. Oberfläche nur Deutsch, keine Übersetzung geplant.
15. Schnappschuss für „Neu“ nach jeder eigenen Datenänderung erneuern; Vergleich ohne Status, Saison-Impfungen nur nach Vorhandensein.
16. Auf heute vorgezogene Erinnerungen gelten beim Vergleich als „sofort“.
17. Repo `impfpass.github.io` in der Organisation `impfpass`, die App liegt an der Wurzel der Adresse.
