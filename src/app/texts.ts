// Alle Texte der Oberfläche an einer Stelle, damit Begriffe einheitlich bleiben.
export const T = {
  app: {
    name: "ImpfPass",
    loading: "Wird geladen …",
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
  storageError: {
    title: "Speichern nicht möglich",
    text: "ImpfPass kann auf diesem Gerät keine Daten speichern. Das passiert zum Beispiel im privaten Modus des Browsers. Öffne ImpfPass in einem normalen Fenster.",
  },
  setup: {
    title: "Willkommen",
    intro:
      "Trag deinen Namen und dein Geburtsdatum ein. Die Angaben bleiben auf diesem Gerät.",
    name: "Name",
    birthDate: "Geburtsdatum",
    submit: "Weiter",
    errors: {
      nameMissing: "Bitte gib einen Namen ein.",
      birthDateMissing: "Bitte gib das Geburtsdatum ein.",
      birthDateInvalid: "Bitte gib ein gültiges Geburtsdatum ein.",
      birthDateFuture: "Das Geburtsdatum liegt in der Zukunft.",
    },
  },
  overview: {
    title: "Übersicht",
  },
  list: {
    title: "Impfungen",
    empty: "Noch keine Impfungen eingetragen.",
    addFirst: "Impfung eintragen",
    sort: {
      label: "Sortierung",
      dateDesc: "Neueste zuerst",
      dateAsc: "Älteste zuerst",
      product: "Impfstoff",
      disease: "Krankheit",
    },
  },
  entry: {
    addTitle: "Neue Impfung",
    editTitle: "Impfung bearbeiten",
    detailTitle: "Impfung",
  },
  settings: {
    title: "Einstellungen",
    profile: "Profil",
    saveProfile: "Profil speichern",
    saved: "Gespeichert.",
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
    confirmText: (date: string, count: number) =>
      `Die Sicherung vom ${date} enthält ${count} ${count === 1 ? "Impfung" : "Impfungen"}. Was jetzt auf diesem Gerät gespeichert ist, wird dabei gelöscht.`,
    confirmAction: "Ersetzen",
    restored: "Die Sicherung wurde wiederhergestellt.",
    restoreFailed:
      "Die Wiederherstellung hat nicht geklappt. Die bisherigen Daten sind unverändert.",
    errors: {
      notBackup: "Diese Datei ist keine ImpfPass-Sicherung.",
      tooNew:
        "Diese Sicherung stammt aus einer neueren Version von ImpfPass. Bitte aktualisiere die App.",
      corrupt: "Die Sicherung ist beschädigt und kann nicht gelesen werden.",
    },
  },
} as const;
