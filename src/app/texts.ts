// Alle Texte der Oberfläche an einer Stelle, damit Begriffe einheitlich bleiben.
export const T = {
  app: {
    name: "ImpfPass",
  },
  backup: {
    errors: {
      notBackup: "Diese Datei ist keine ImpfPass-Sicherung.",
      tooNew:
        "Diese Sicherung stammt aus einer neueren Version von ImpfPass. Bitte aktualisiere die App.",
      corrupt: "Die Sicherung ist beschädigt und kann nicht gelesen werden.",
    },
  },
} as const;
