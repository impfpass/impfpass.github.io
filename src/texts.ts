// Alle Texte der Oberfläche an einer Stelle, damit Begriffe einheitlich bleiben.
/** „Hans“, „Hans und Christa“, „Hans, Christa und Paul“ */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

function backupSummary(
  date: string,
  names: readonly string[],
  count: number,
): string {
  const forWhom = names.length > 0 ? ` für ${joinNames(names)}` : "";
  return `Die Sicherung vom ${date}${forWhom} enthält ${count} ${count === 1 ? "Impfung" : "Impfungen"}.`;
}

export const T = {
  app: {
    name: "ImpfPass",
    loading: "Wird geladen …",
  },
  // Steht als statischer Text in index.html, bis React startet (vite/bootFallback.ts)
  boot: {
    loading: "ImpfPass wird geladen …",
    tooOld:
      "Bleibt diese Meldung stehen, ist der Browser zu alt für ImpfPass. Nötig ist auf dem iPhone mindestens iOS 16.4, sonst ein aktueller Chrome, Edge, Firefox oder Safari.",
  },
  common: {
    cancel: "Abbrechen",
    saveFailed: "Speichern hat nicht geklappt. Bitte versuche es noch einmal.",
  },
  nav: {
    label: "Hauptnavigation",
    overview: "Übersicht",
    list: "Impfungen",
    add: "Neue Impfung",
    settings: "Einstellungen",
  },
  installHint: {
    text: "Tipp: Tippe auf Teilen und dann auf ‚Zum Home-Bildschirm‘. Dann startet ImpfPass wie eine App und deine Daten sind besser geschützt. Die App auf dem Home-Bildschirm hat einen eigenen Speicher: Speichere hier vorher eine Sicherung und stelle sie dort in den Einstellungen wieder her.",
    dismiss: "Hinweis ausblenden",
  },
  storageError: {
    title: "Speichern nicht möglich",
    text: "ImpfPass kann auf diesem Gerät keine Daten speichern. Das passiert zum Beispiel im privaten Modus des Browsers. Öffne ImpfPass in einem normalen Fenster.",
  },
  setup: {
    title: "Willkommen",
    intro:
      "Trag deinen Namen und dein Geburtsdatum ein. Die Angaben bleiben auf diesem Gerät.",
    iosHint:
      "Auf dem iPhone: Füge ImpfPass zuerst zum Home-Bildschirm hinzu (Teilen, dann ‚Zum Home-Bildschirm‘) und starte es von dort. Was du hier in Safari einträgst, erscheint in der App auf dem Home-Bildschirm nicht.",
    name: "Name",
    birthDate: "Geburtsdatum",
    submit: "Weiter",
    restoreHint: "Du hast schon eine Sicherung von ImpfPass?",
    errors: {
      nameMissing: "Bitte gib einen Namen ein.",
      birthDateMissing: "Bitte gib das Geburtsdatum ein.",
      birthDateInvalid: "Bitte gib ein gültiges Geburtsdatum ein.",
      birthDateFuture: "Das Geburtsdatum liegt in der Zukunft.",
    },
  },
  answers: {
    title: "Angaben für Empfehlungen",
    intro:
      "Manche Impfungen empfiehlt die STIKO nur bestimmten Menschen. Diese Angaben bleiben auf diesem Gerät, du kannst sie später in den Einstellungen ändern.",
    chronic: "Ich habe eine chronische Erkrankung",
    chronicHelp:
      "Bei manchen Impfungen empfiehlt die STIKO Menschen mit bestimmten Grunderkrankungen, früher zu impfen. Ob das für dich gilt, entscheidet deine Ärztin oder dein Arzt. ImpfPass zeigt dir dafür Karten „Mit dem Arzt besprechen“.",
    fsmeQuestion:
      "Hältst du dich in FSME-Risikogebieten im Freien auf, zu Hause oder im Urlaub (Garten, Wald, Wandern)?",
    fsmeYes: "Ja",
    fsmeNo: "Nein",
    fsmeOpen: "Weiß ich nicht",
    fsmeHelp:
      "FSME wird durch Zecken übertragen. Welche Landkreise als Risikogebiet gelten, zeigt die Karte des Robert Koch-Instituts.",
    fsmeLink: "Karte der FSME-Risikogebiete (RKI)",
    fsmeLinkUrl:
      "https://www.rki.de/DE/Themen/Infektionskrankheiten/Infektionskrankheiten-A-Z/F/FSME/Karte.html",
    jobTitle: "Beruf und Tierkontakt",
    jobPatients: "Ich arbeite mit Patienten oder Pflegebedürftigen.",
    jobCommunity:
      "Ich arbeite in einer Kita, Schule oder anderen Gemeinschaftseinrichtung.",
    jobBlood:
      "Ich habe Kontakt mit Blut oder anderen Körperflüssigkeiten, auch im Rettungsdienst oder bei der Polizei.",
    jobAnimals:
      "Ich habe regelmäßig direkten Kontakt zu Geflügel, Schweinen, Wildvögeln oder ähnlichen Tieren, beruflich oder privat.",
    jobHint:
      "Für Impfungen wegen des Berufs ist meist die Betriebsärztin oder der Betriebsarzt zuständig, die Kosten trägt der Arbeitgeber.",
    back: "Zurück",
  },
  overview: {
    title: "Übersicht",
    lastVaccinated: (date: string, precision: "day" | "month" | "year") =>
      precision === "day"
        ? `zuletzt geimpft am ${date}`
        : `zuletzt geimpft ${date}`,
    later: "Empfehlungen und Erinnerungen folgen in einer späteren Version.",
  },
  list: {
    title: "Impfungen",
    empty: "Noch keine Impfungen eingetragen.",
    addFirst: "Impfung eintragen",
    sort: {
      label: "Sortierung",
      date: "Datum",
      product: "Impfstoff",
      disease: "Krankheit",
      newestFirst: "Neueste zuerst",
      oldestFirst: "Älteste zuerst",
      aToZ: "A bis Z",
      zToA: "Z bis A",
      flipHint: "Zum Umdrehen nochmals tippen.",
    },
  },
  entry: {
    addTitle: "Neue Impfung",
    editTitle: "Impfung bearbeiten",
    detailTitle: "Impfung",
    precision: {
      label: "Wie genau ist das Datum bekannt?",
      day: "Tag bekannt",
      month: "nur Monat",
      year: "nur Jahr",
    },
    date: "Datum",
    month: "Monat",
    year: "Jahr",
    product: "Impfstoff",
    productHint: "Name wie im Impfpass, zum Beispiel Boostrix Polio",
    suggestions: "Vorschläge",
    protectsAgainst: "Schützt vor",
    diseases: "Krankheiten",
    diseasesHint:
      "Kein passender Impfstoff in der Liste? Dann wähle die Krankheiten aus, gegen die geimpft wurde.",
    batch: "Charge",
    doctor: "Arzt oder Praxis",
    note: "Notiz",
    save: "Speichern",
    cancel: "Abbrechen",
    saved: "Die Impfung ist gespeichert.",
    toList: "Zur Liste",
    toEntry: "Zur Impfung",
    addAnother: "Weitere Impfung eintragen",
    edit: "Bearbeiten",
    delete: "Löschen",
    deleteTitle: "Diese Impfung löschen?",
    deleteText: "Der Eintrag wird von diesem Gerät gelöscht.",
    notFound: "Diese Impfung gibt es nicht.",
    labelInPass: "Im Pass",
    source: {
      label: "Herkunft",
      manual: "selbst eingetragen",
      import: "vom PC übernommen",
    },
    errors: {
      dateMissing: "Bitte ein Datum angeben.",
      dateFuture: "Das Datum liegt in der Zukunft.",
      dateBeforeBirth: "Das Datum liegt vor deinem Geburtstag.",
      productMissing:
        "Bitte einen Impfstoff wählen oder mindestens eine Krankheit angeben.",
    },
  },
  backupHint: {
    question: "Sicherung speichern?",
    text: "Deine Daten liegen nur auf diesem Gerät. Speichere die Sicherung in iCloud Drive oder auf einem anderen Gerät, dann sind sie auch geschützt, wenn das Handy verloren geht.",
    now: "Jetzt sichern",
    later: "Später",
    done: "Die Sicherung ist gespeichert.",
  },
  settings: {
    title: "Einstellungen",
    profile: "Profil",
    saveProfile: "Profil speichern",
    saved: "Gespeichert.",
    saveAnswers: "Angaben speichern",
    reminders: "Erinnerungen",
    leadTime: "Vorlauf",
    leadTimeOption: (n: number) => (n === 1 ? "1 Monat" : `${n} Monate`),
    leadTimeHelp:
      "So viele Monate vor der Fälligkeit wird eine Impfung in der Übersicht gelb. Dann ist Zeit, einen Termin auszumachen.",
    seasonDay: "Saison-Tag",
    seasonDayOptions: {
      "08-01": "1. August",
      "08-15": "15. August",
      "09-01": "1. September",
      "09-15": "15. September",
      "10-01": "1. Oktober",
    },
    seasonDayHelp:
      "Ab diesem Tag werden die jährlichen Impfungen im Herbst gelb, etwa gegen Grippe.",
    backup: "Datensicherung",
    lastBackup: (date: string) => `Letzte Sicherung: ${date}`,
    noBackup: "Noch keine Sicherung gespeichert.",
  },
  info: {
    title: "Info",
    notMedicalAdvice:
      "ImpfPass ersetzt keine ärztliche Beratung. Sprich vor einer Impfung mit deiner Ärztin oder deinem Arzt.",
    privacy:
      "Deine Daten bleiben auf diesem Gerät. ImpfPass schickt nichts ins Internet. Daten verlassen das Gerät nur, wenn du es selbst auslöst, zum Beispiel beim Speichern einer Sicherung.",
    backup: "Die Sicherung enthält deine Impfdaten. Bewahre sie sicher auf.",
    version: (v: string) => `Version ${v}`,
  },
  backup: {
    save: "Sicherung speichern",
    saveFailed:
      "Die Sicherung konnte nicht erstellt werden. Bitte versuche es noch einmal.",
    restore: "Sicherung wiederherstellen",
    confirmTitle: "Alle Daten auf diesem Gerät durch die Sicherung ersetzen?",
    confirmText: (date: string, names: readonly string[], count: number) =>
      `${backupSummary(date, names, count)} Was jetzt auf diesem Gerät gespeichert ist, wird dabei gelöscht.`,
    confirmAction: "Ersetzen",
    confirmTitleEmpty: "Diese Sicherung übernehmen?",
    confirmTextEmpty: (date: string, names: readonly string[], count: number) =>
      backupSummary(date, names, count),
    confirmActionEmpty: "Übernehmen",
    restored: "Die Sicherung wurde wiederhergestellt.",
    restoreFailed:
      "Die Wiederherstellung hat nicht geklappt. Die bisherigen Daten sind unverändert.",
    errors: {
      notBackup: "Diese Datei ist keine ImpfPass-Sicherung.",
      tooNew:
        "Diese Sicherung stammt aus einer neueren Version von ImpfPass. Bitte aktualisiere die App.",
      corrupt: "Die Sicherung ist beschädigt und kann nicht gelesen werden.",
      tooLarge: "Diese Datei ist zu groß für eine ImpfPass-Sicherung.",
    },
  },
} as const;
