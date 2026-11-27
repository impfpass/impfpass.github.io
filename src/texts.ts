// Alle Texte der Oberfläche an einer Stelle, damit Begriffe einheitlich bleiben.
/** „Hans“, „Hans und Christa“, „Hans, Christa und Paul“ */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

/** „1 Impfung“, „2 Impfungen“ */
function vaccinationCount(n: number): string {
  return `${n} ${n === 1 ? "Impfung" : "Impfungen"}`;
}

/** Hängt einen Punkt an, wenn der Text nicht schon mit einem Satzzeichen endet. */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
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
    close: "Schließen",
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
    startTitle: "Wie möchtest du anfangen?",
    startImport: "Alte Impfungen vom PC übernehmen",
    startImportHelp:
      "Am PC kann ein Chatbot die Fotos deines Impfpasses lesen, und du prüfst alles in einer großen Tabelle. Öffne dazu am PC impfpass.github.io/import/. Danach überträgst du die Impfungen mit QR-Codes hierher.",
    startManual: "Einträge selbst eingeben",
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
    noVaccinations:
      "Du hast noch keine Impfungen eingetragen. Bis dahin steht hier fast alles unter „Jetzt fällig“.",
    addFirst: "Impfung eintragen",
    under18: "ImpfPass berechnet Empfehlungen ab 18 Jahren.",
    groups: {
      red: "Jetzt fällig",
      yellow: "Bald fällig",
      green: "Geschützt",
      grey: "Später",
    },
    makeAppointment: "Termin ausmachen",
    others: "Weitere Impfungen",
    hidden: "Ausgeblendet",
    declined: "Möchte ich nicht",
    notNeeded: (reason: string | undefined) =>
      reason ? `Nicht nötig: ${reason}` : "Nicht nötig",
    footerEdition: (edition: string, date: string) =>
      `STIKO-Stand: ${edition}, Regeln vom ${date}`,
    footerAdvice: "ImpfPass ersetzt keine ärztliche Beratung.",
    notice: {
      new: (text: string) => `Neu: ${sentence(text)} Betrifft dich.`,
      changed: (text: string) => `Geändert: ${text}`,
      dropped: (text: string) => `Entfällt: ${text}`,
      view: "Ansehen",
      dismiss: "Verstanden",
    },
    tbe: {
      question:
        "Du hast FSME-Impfungen eingetragen. Soll ImpfPass an die Auffrischungen erinnern?",
      yes: "Ja, erinnern",
      no: "Nein",
    },
    discuss: {
      title: "Mit dem Arzt besprechen",
      normalAge: (age: number) => `Für alle empfohlen ab ${age} Jahren.`,
      noNormal: "Ohne besonderen Grund nicht empfohlen.",
      serology: "Ob du geschützt bist, kann ein Bluttest klären.",
      targetGroup: (group: string) =>
        `Die STIKO empfiehlt sie früher oder zusätzlich für: ${group}`,
      doctorRecommends: "Arzt empfiehlt sie mir",
      notApplicable: "Trifft nicht zu",
    },
  },
  rec: {
    names: {
      td: "Tetanus und Diphtherie",
      pertussis: "Keuchhusten",
      polio: "Kinderlähmung (Polio)",
      mmr: "Masern, Mumps, Röteln",
      varicella: "Windpocken",
      hepatitis_b: "Hepatitis B",
      hepatitis_a: "Hepatitis A",
      influenza: "Grippe",
      covid19: "COVID-19",
      pneumococcal: "Pneumokokken",
      zoster: "Gürtelrose",
      rsv: "RSV",
      tbe: "FSME",
    } as Record<string, string>,
    status: {
      overdueSince: (d: string) => `überfällig seit ${d}`,
      dueNow: "jetzt fällig",
      doseDue: (n: number | string) => `${n}. Dosis fällig`,
      latest: (d: string) => `, spätestens ${d}`,
      seasonOpen: (label: string) => `für die Saison ${label} noch offen`,
      dueFrom: (d: string) => `fällig ab ${d}`,
      doseFrom: (n: number | string, d: string) => `${n}. Dosis ab ${d}`,
      seasonFrom: (label: string, d: string) =>
        `für die Saison ${label} ab ${d}`,
      seasonDone: (label: string) => `für die Saison ${label} geimpft`,
      protectedUntil: (d: string) => `geschützt bis ${d}`,
      protectedNoBooster: "geschützt, keine Auffrischung nötig",
      protectedOpen: "geschützt, Auffrischung derzeit nicht vorgesehen",
      nextSeason: (d: string) => `nächste Saison ab ${d}`,
      fromAge: (age: number, d: string) => `ab ${age} Jahren, also ab ${d}`,
      from: (d: string) => `ab ${d}`,
    },
    detail: {
      notFound: "Diese Empfehlung gibt es nicht.",
      why: "Warum",
      source: "Fundstelle",
      sourceLine: (
        edition: string,
        date: string,
        section: string,
        page: number | null,
      ) => `${edition} vom ${date}, ${section}${page ? `, S. ${page}` : ""}`,
      validSince: (d: string) => `Gilt seit ${d}`,
      earlierWithIllness:
        "Bei bestimmten Erkrankungen empfiehlt die STIKO diese Impfung früher.",
      doctorAnswer: "Antwort deiner Ärztin oder deines Arztes",
      stillOpen: "Noch offen",
      answeredOn: (d: string) => `Geantwortet am ${d}`,
      entered: "Eingetragene Impfungen",
      noneEntered: "Noch keine passende Impfung eingetragen.",
      decisions: "Deine Entscheidung",
      wantNot: "Möchte ich nicht",
      notNeeded: "Nicht nötig",
      showAgain: "Wieder anzeigen",
      declinedText: "Du möchtest diese Impfung nicht. Sie ist ausgeblendet.",
      notNeededHint:
        "Die Impfung erscheint dann nicht mehr unter den Empfehlungen, auch nicht für spätere Auffrischungen. Mit „Wieder anzeigen“ holst du sie zurück.",
      notNeededReasons: {
        legend: "Warum ist die Impfung nicht nötig?",
        illness: "Erkrankung durchgemacht",
        serology: "Immunität per Bluttest belegt",
        otherCard: "In einem anderen Impfpass belegt",
        other: "Anderer Grund",
      },
      reasonLabel: "Grund",
      reasonMissing: "Bitte gib einen Grund ein.",
      save: "Speichern",
      cancel: "Abbrechen",
      reason: {
        booster: (lastDate: string, years: number) =>
          `Letzte Impfung am ${lastDate}. Die nächste Auffrischung ist ${years} Jahre danach vorgesehen.`,
        afterDose: (lastDate: string, years: number) =>
          `Letzte Impfung am ${lastDate}. Die STIKO empfiehlt die nächste frühestens ${years} ${years === 1 ? "Jahr" : "Jahre"} danach.`,
        age: (age: number) =>
          `Die STIKO empfiehlt diese Impfung allen ab ${age} Jahren.`,
        withTd:
          "Die STIKO empfiehlt Erwachsenen, die nächste fällige Impfung gegen Tetanus und Diphtherie einmal mit Keuchhusten-Schutz zu bekommen.",
        series: (given: number, total: number) =>
          `Eingetragen sind ${given} von ${vaccinationCount(total)}.`,
        catchUp: (given: number, total: number) =>
          `Eingetragen sind ${given} von ${vaccinationCount(total)} der Grundimmunisierung. Stehen frühere Impfungen in einem anderen Impfpass, trag sie hier ein, auch wenn nur das Jahr bekannt ist. Dann rechnet ImpfPass mit den Auffrischungen weiter.`,
        started: (given: number, total: number) =>
          `Eingetragen sind ${given} von ${vaccinationCount(total)}. Eine angefangene Serie wird zu Ende geführt, fehlende Impfungen werden nachgeholt, ohne neu anzufangen.`,
        season: (label: string) => `Jährliche Impfung, Saison ${label}.`,
        job: "Empfohlen wegen deiner Tätigkeit.",
        tbe: "Empfohlen, weil du dich in FSME-Risikogebieten aufhältst.",
        doctor: "Deine Ärztin oder dein Arzt empfiehlt sie dir.",
        complete:
          "Die Impfungen sind vollständig, eine Auffrischung ist nicht vorgesehen.",
        longProtection:
          "Die Impfungen sind vollständig. Die STIKO rechnet mit einem Schutz für mindestens 10 bis 20 Jahre. Ob später eine Auffrischung nötig wird, ist derzeit offen.",
        none: "Die STIKO empfiehlt diese Impfung für dich derzeit nicht.",
      },
    },
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
    doctorSuggestions: "Bisher eingetragen",
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
    answersIntro:
      "Manche Impfungen empfiehlt die STIKO nur bestimmten Menschen. Diese Angaben bleiben auf diesem Gerät.",
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
    transfer: "Impfungen übernehmen",
    transferText: "Alte Impfungen vom PC holen, per QR-Code, Datei oder Text.",
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
    rules: "Empfehlungen",
    edition: (e: string) => `STIKO-Stand: ${e}`,
    rulebook: (v: string) => `Regelwerk-Version: ${v}`,
    sources: "Quellen",
    derived:
      "Die Regeln sind selbst aus den Empfehlungen der STIKO abgeleitet. Bei Fragen zu deiner Impfung entscheidet deine Ärztin oder dein Arzt.",
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
  pc: {
    title: "ImpfPass am PC",
    notSaved:
      "Dieser Browser erlaubt kein Speichern. Der Entwurf geht verloren, wenn du die Seite schließt.",
    steps: {
      label: "Schritte",
      guide: "Anleitung",
      table: "Tabelle prüfen",
      transfer: "Übertragen",
    },
    footer: {
      medical: "ImpfPass ersetzt keine ärztliche Beratung.",
      local: "Der Entwurf bleibt in diesem Browser auf diesem PC.",
    },
    prompt: `Auf den Fotos sind Seiten aus einem deutschen Impfpass. Lies alle Impfungen ab und gib sie als JSON in genau diesem Format zurück, in einem einzigen Codeblock:

{"impfpass":"import","vaccinations":[{"date":"05.12.2016","name":"Boostrix Polio","batch":"AC52B123AB","doctor":"Praxis Dr. Muster, Hamburg","diseases":[],"unsure":[]}]}

So füllst du die Felder:
- Ein Eintrag je Impfung. Klebt derselbe Impfstoff mit demselben Datum in mehreren Abschnitten des Passes, trag ihn nur einmal ein.
- date: das Datum wie im Pass als TT.MM.JJJJ. Ist nur Monat und Jahr lesbar, schreib MM.JJJJ, ist nur das Jahr lesbar, JJJJ.
- name: der Handelsname des Impfstoffs, so wie er auf dem Aufkleber oder im Stempel steht.
- batch: die Chargennummer, sonst "".
- doctor: Arzt, Praxis oder Ort aus dem Stempel, sonst "".
- diseases: nur wenn kein Handelsname lesbar ist, die Krankheiten auf Deutsch, etwa ["Tetanus","Diphtherie"]. Sonst [].
- unsure: die Felder, die du nicht sicher lesen konntest, etwa ["date","batch"]. Rate nicht. Schreib, was du lesen kannst, und nenn das Feld hier.
- Lass alles weg, was keine Impfung ist, etwa Tuberkulintests, Blutgruppe oder Antikörperbefunde.`,
    guide: {
      heading: "Alte Impfungen übernehmen",
      steps: [
        "1. Fotografiere die Seiten deines Impfpasses und bring die Fotos auf diesen PC.",
        "2. Kopiere die Anleitung unten und gib sie zusammen mit den Fotos einem Chatbot, etwa Claude oder ChatGPT.",
        "3. Füge die Antwort des Chatbots unten ein und prüfe die Tabelle.",
      ],
      privacy:
        "Die Fotos zeigen Gesundheitsdaten. Lädst du sie bei einem Chatbot hoch, landen sie beim Anbieter des Chatbots, nicht bei ImpfPass. Schalte dort die Verwendung deiner Daten für das Training ab, wo das geht.",
      promptLabel: "Anleitung für den Chatbot",
      copy: "Anleitung kopieren",
      copied: "Kopiert.",
      copyFailed:
        "Kopieren hat nicht geklappt. Der Text ist markiert, kopiere ihn mit Strg+C.",
      birthDate: "Geburtsdatum (freiwillig)",
      birthDateHelp:
        "Nur zur Prüfung der Daten. Es bleibt auf diesem PC und wird nicht übertragen.",
      birthDatePlaceholder: "TT.MM.JJJJ",
      answerLabel: "Antwort des Chatbots",
      read: "Einlesen",
      skip: "Ohne Chatbot weiter",
      imported: (n: number) =>
        `${n} ${n === 1 ? "Impfung" : "Impfungen"} eingelesen. Prüfe sie in der Tabelle.`,
      draftHas: (n: number) =>
        `Der Entwurf enthält schon ${vaccinationCount(n)}.`,
      appendQuestion: (n: number) =>
        `Der Entwurf enthält schon ${vaccinationCount(n)}. Sollen die neuen angehängt werden, oder willst du vorher alles löschen?`,
      append: "Anhängen",
      replace: "Vorher löschen",
      cancel: "Abbrechen",
    },
    chatbotErrors: {
      noJson:
        "In der Antwort steht keine Liste von Impfungen. Kopiere die ganze Antwort des Chatbots, auch den Codeblock.",
      noEntries: "Die Antwort enthält keine Impfungen.",
      tooLong: "Die Antwort ist zu lang. Füge höchstens 1 MB Text ein.",
    },
    issues: {
      dateMissing: "Datum fehlt.",
      dateInvalid: "Datum nicht lesbar. Schreib TT.MM.JJJJ, MM.JJJJ oder JJJJ.",
      dateFuture: "Das Datum liegt in der Zukunft.",
      dateBeforeBirth: "Das Datum liegt vor dem Geburtsdatum.",
      noDisease: "Impfstoff nicht erkannt. Wähle die Krankheiten.",
      textTooLong: "Text zu lang, höchstens 500 Zeichen je Feld.",
      productFuzzy: (read: string, name: string) =>
        `Gelesen „${read}“, erkannt als ${name}.`,
      productAmbiguous: "Mehrere Impfstoffe passen:",
      productUnknown:
        "Impfstoff nicht in der Liste. Die Krankheiten sind von Hand gewählt.",
      fields: {
        date: "Datum",
        label: "Impfstoff",
        batch: "Charge",
        doctor: "Arzt oder Praxis",
        diseases: "Krankheiten",
      },
      unsure: (fields: string[]) => `Unsicher gelesen: ${fields.join(", ")}.`,
      duplicate: (n: number) => `Vielleicht doppelt, siehe Zeile ${n}.`,
    },
    hints: {
      diseaseUnknown: (name: string) => `Krankheit „${name}“ nicht erkannt.`,
    },
    table: {
      label: "Impfungen zum Prüfen",
      columns: {
        number: "Nr.",
        date: "Datum",
        label: "Impfstoff",
        diseases: "Krankheiten",
        batch: "Charge",
        doctor: "Arzt oder Praxis",
        note: "Notiz",
        issues: "Hinweise",
        remove: "Löschen",
      },
      /** Name eines Felds für Screenreader, etwa „Datum, Zeile 3“. */
      field: (name: string, row: number) => `${name}, Zeile ${row}`,
      datePlaceholder: "TT.MM.JJJJ",
      error: "Fehler:",
      hint: "Hinweis:",
      reviewed: "Hinweise geprüft",
      add: "Zeile hinzufügen",
      removed: (n: number) => `Zeile ${n} gelöscht.`,
      undo: "Rückgängig",
      empty: "Die Tabelle ist leer. Füge eine Zeile hinzu.",
      summary: (n: number, errors: number, hints: number) =>
        `${n} ${n === 1 ? "Impfung" : "Impfungen"}, ${errors} mit Fehlern, ${hints} mit Hinweisen.`,
      birthInvalid:
        "Das Geburtsdatum ist nicht lesbar. Schreib es als TT.MM.JJJJ. Ändere es in Schritt 1.",
      birthFuture:
        "Das Geburtsdatum liegt in der Zukunft. Ändere es in Schritt 1.",
      next: "Weiter zum Übertragen",
      blocked: "Behebe zuerst die rot markierten Zeilen.",
      confirmHints: (h: number) =>
        `${h} ${h === 1 ? "Zeile hat" : "Zeilen haben"} noch Hinweise. Trotzdem übertragen?`,
      back: "Zurück zur Tabelle",
      transfer: "Übertragen",
    },
    send: {
      codesHeading: "QR-Codes",
      codeOf: (n: number, total: number) => `Code ${n} von ${total}`,
      codeLabel: (n: number, total: number) => `QR-Code ${n} von ${total}`,
      previous: "Vorheriger Code",
      next: "Nächster Code",
      codesHelp:
        "Öffne ImpfPass auf dem Handy, tippe in den Einstellungen auf „Impfungen übernehmen“ und scanne die Codes. Die Reihenfolge ist egal.",
      codesPrivacy:
        "Die Codes enthalten deine Impfdaten. Sie gehen vom Bildschirm direkt in die Kamera deines Handys, nicht ins Internet.",
      fileHeading: "Datei",
      saveFile: "Datei speichern",
      fileHelp:
        "Schick die Datei aufs Handy und öffne sie in ImpfPass unter „Impfungen übernehmen“ mit „Datei öffnen“. Per E-Mail oder über eine Cloud gehen die Daten dabei über deren Anbieter.",
      textHeading: "Text",
      copyText: "Text kopieren",
      textLabel: "Übertragungstext",
      textHelp:
        "Füge den Text auf dem Handy in ImpfPass unter „Impfungen übernehmen“ mit „Text einfügen“ ein. Schickst du ihn per E-Mail, Messenger oder über eine Cloud, gehen die Daten dabei über deren Anbieter.",
      back: "Zurück zur Tabelle",
      deleteDraft: "Entwurf löschen",
      deleteTitle:
        "Entwurf löschen? Die Tabelle mit allen Einträgen wird auf diesem PC gelöscht.",
      deleteConfirm: "Löschen",
      cancel: "Abbrechen",
      deleted: "Der Entwurf ist gelöscht.",
      tooManyRows:
        "Der Entwurf hat zu viele Zeilen für eine Übertragung (höchstens 2000).",
      tooManyCodes:
        "Zu viele Einträge für QR-Codes. Nimm die Datei oder den Text.",
    },
    diseasePicker: {
      open: (n: number) => `Krankheiten wählen (${n})`,
      title: (row: number) => `Krankheiten für Zeile ${row}`,
      description: "Wähle alle Krankheiten, gegen die diese Impfung schützt.",
      confirm: "Übernehmen",
    },
  },
  transfer: {
    title: "Impfungen übernehmen",
    intro:
      "Öffne am PC impfpass.github.io/import/, prüf dort deine Impfungen und übertrag sie dann hierher.",
    waysLabel: "So übernimmst du die Impfungen",
    scanCodes: "QR-Code scannen",
    openFile: "Datei öffnen",
    fileTooLarge: "Die Datei ist zu groß für eine Übertragung.",
    pasteText: "Text einfügen",
    read: "Einlesen",
    /** „2 von 3 Teilen gelesen. Es fehlt noch Teil 3.“ */
    progress: (read: number, total: number, missing: readonly number[]) =>
      `${read} von ${total} Teilen gelesen. ${missing.length === 1 ? "Es fehlt" : "Es fehlen"} noch Teil ${joinNames(missing.map(String))}.`,
    restart: "Neu beginnen",
    startOver: "Von vorn beginnen",
    scanner: {
      videoLabel: "Kamerabild",
      help: "Halte die Kamera auf den Code am PC-Bildschirm.",
      denied:
        "ImpfPass darf die Kamera nicht benutzen. Erlaube den Zugriff in den Einstellungen des Handys, oder übertrag die Impfungen als Datei oder Text.",
      missing:
        "Keine Kamera gefunden. Übertrag die Impfungen als Datei oder Text.",
      failed: "Die Kamera lässt sich nicht starten.",
      retry: "Noch einmal versuchen",
    },
    preview: {
      label: "Gefundene Impfungen",
      summary: (n: number, duplicates: number) =>
        `${vaccinationCount(n)} gefunden, davon ${duplicates} schon eingetragen.`,
      duplicate: (label: string, date: string) =>
        `Schon eingetragen: ${label}, ${date}.`,
      dateBeforeBirth: "Das Datum liegt vor deinem Geburtsdatum.",
      dateFuture: "Das Datum liegt in der Zukunft.",
      import: (k: number) => `${vaccinationCount(k)} übernehmen`,
    },
    done: (k: number) => `${vaccinationCount(k)} übernommen.`,
    toList: "Zu den Impfungen",
    errors: {
      notTransfer: "Das ist kein Code von ImpfPass.",
      otherTransfer: "Dieser Code gehört zu einer anderen Übertragung.",
      tooNew:
        "Die Übertragung stammt aus einer neueren Version von ImpfPass. Schließe ImpfPass ganz und öffne es wieder, dann lädt die neue Version.",
      corrupt: "Die Übertragung ist beschädigt. Erzeuge sie am PC neu.",
    },
  },
} as const;
