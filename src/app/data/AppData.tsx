/* eslint-disable react-refresh/only-export-components -- Provider und Hook gehören zusammen */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BackupFile } from "@/core/formats/backup";
import {
  DEFAULT_ANSWERS,
  DEFAULT_SETTINGS,
  type ISODate,
  type Person,
  type Settings,
  type Vaccination,
} from "@/core/model";
import {
  openRepository,
  requestPersistence,
  type BackupData,
  type Repository,
} from "@/core/storage/repository";

export interface AppData {
  status: "loading" | "ready" | "unavailable";
  person: Person | null;
  vaccinations: Vaccination[];
  settings: Settings;
  actions: {
    createPerson(input: { name: string; birthDate: ISODate }): Promise<void>;
    updatePerson(p: Person): Promise<void>;
    saveVaccination(v: Vaccination): Promise<void>;
    deleteVaccination(id: string): Promise<void>;
    saveSettings(s: Settings): Promise<void>;
    restore(b: BackupFile): Promise<void>;
    /** Alle gespeicherten Daten für eine Sicherung. */
    exportData(): Promise<BackupData>;
  };
}

const AppDataContext = createContext<AppData | null>(null);

interface Loaded {
  person: Person | null;
  vaccinations: Vaccination[];
  settings: Settings;
}

/** Phase 1 zeigt genau eine Person: die zuerst angelegte. */
async function loadAll(repo: Repository): Promise<Loaded> {
  const persons = await repo.getPersons();
  persons.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const person = persons[0] ?? null;
  const [vaccinations, settings] = await Promise.all([
    person ? repo.getVaccinations(person.id) : Promise.resolve([]),
    repo.getSettings(),
  ]);
  return { person, vaccinations, settings };
}

interface State extends Loaded {
  status: AppData["status"];
  repo: Repository | null;
}

const INITIAL: State = {
  status: "loading",
  repo: null,
  person: null,
  vaccinations: [],
  settings: DEFAULT_SETTINGS,
};

export function AppDataProvider(props: {
  open?: () => Promise<Repository>;
  children: ReactNode;
}) {
  // Nur beim ersten Rendern übernehmen, damit eine neue Funktion pro Rendern
  // die Datenbank nicht erneut öffnet.
  const [open] = useState(() => props.open ?? openRepository);
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repo = await open();
        const loaded = await loadAll(repo);
        if (!cancelled) setState({ status: "ready", repo, ...loaded });
      } catch {
        if (!cancelled) setState({ ...INITIAL, status: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const { repo } = state;
  const requireRepo = useCallback((): Repository => {
    if (!repo) throw new Error("Speicher ist noch nicht bereit");
    return repo;
  }, [repo]);

  const createPerson = useCallback<AppData["actions"]["createPerson"]>(
    async ({ name, birthDate }) => {
      const person: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        birthDate,
        answers: DEFAULT_ANSWERS,
        createdAt: new Date().toISOString(),
      };
      await requireRepo().savePerson(person);
      setState((s) => ({ ...s, person, vaccinations: [] }));
      void requestPersistence();
    },
    [requireRepo],
  );

  const updatePerson = useCallback(
    async (p: Person) => {
      await requireRepo().savePerson(p);
      setState((s) => ({ ...s, person: p }));
    },
    [requireRepo],
  );

  const saveVaccination = useCallback(
    async (v: Vaccination) => {
      await requireRepo().saveVaccination(v);
      setState((s) => ({
        ...s,
        vaccinations: [...s.vaccinations.filter((x) => x.id !== v.id), v],
      }));
    },
    [requireRepo],
  );

  const deleteVaccination = useCallback(
    async (id: string) => {
      await requireRepo().deleteVaccination(id);
      setState((s) => ({
        ...s,
        vaccinations: s.vaccinations.filter((x) => x.id !== id),
      }));
    },
    [requireRepo],
  );

  const saveSettings = useCallback(
    async (settings: Settings) => {
      await requireRepo().saveSettings(settings);
      setState((s) => ({ ...s, settings }));
    },
    [requireRepo],
  );

  const restore = useCallback(
    async (b: BackupFile) => {
      const r = requireRepo();
      await r.replaceAll({
        persons: b.persons,
        vaccinations: b.vaccinations,
        decisions: b.decisions,
        settings: b.settings,
      });
      const loaded = await loadAll(r);
      setState((s) => ({ ...s, ...loaded }));
    },
    [requireRepo],
  );

  const exportData = useCallback(
    () => requireRepo().exportAll(),
    [requireRepo],
  );

  const value = useMemo<AppData>(
    () => ({
      status: state.status,
      person: state.person,
      vaccinations: state.vaccinations,
      settings: state.settings,
      actions: {
        createPerson,
        updatePerson,
        saveVaccination,
        deleteVaccination,
        saveSettings,
        restore,
        exportData,
      },
    }),
    [
      state.status,
      state.person,
      state.vaccinations,
      state.settings,
      createPerson,
      updatePerson,
      saveVaccination,
      deleteVaccination,
      saveSettings,
      restore,
      exportData,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>
      {props.children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData braucht einen AppDataProvider");
  return value;
}
