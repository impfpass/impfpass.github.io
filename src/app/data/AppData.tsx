/* eslint-disable react-refresh/only-export-components -- Provider und Hook gehören zusammen */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { todayISO } from "@/core/dates";
import type { BackupFile } from "@/core/formats/backup";
import {
  DEFAULT_ANSWERS,
  DEFAULT_SETTINGS,
  type Decision,
  type ISODate,
  type Person,
  type PersonAnswers,
  type RuleState,
  type Settings,
  type Vaccination,
} from "@/core/model";
import { evaluate } from "@/core/rules/evaluate";
import { RULEBOOK } from "@/core/rules/rulebook";
import { nextRuleState } from "@/core/rules/ruleState";
import type { Recommendation, Rulebook } from "@/core/rules/types";
import {
  openRepository,
  requestPersistence,
  type BackupData,
  type DatabaseEvents,
  type Repository,
} from "@/core/storage/repository";

export interface AppData {
  status: "loading" | "ready" | "unavailable";
  person: Person | null;
  vaccinations: Vaccination[];
  decisions: Decision[];
  /** Auswertung der Regeln am Tag `today`; ohne Person oder unter 18 leer. */
  recommendations: Recommendation[];
  /**
   * Regel-Stand mit den Hinweisen auf neue Empfehlungen. Der Provider hält
   * ihn aktuell und speichert ihn gleich nach jeder Änderung.
   */
  ruleState: RuleState | null;
  settings: Settings;
  today: ISODate;
  actions: {
    /** Ohne `answers` gelten die Voreinstellungen (DEFAULT_ANSWERS). */
    createPerson(input: {
      name: string;
      birthDate: ISODate;
      answers?: PersonAnswers;
    }): Promise<void>;
    updatePerson(p: Person): Promise<void>;
    saveVaccination(v: Vaccination): Promise<void>;
    deleteVaccination(id: string): Promise<void>;
    /** Person und Zeitpunkt setzt der Provider. */
    saveDecision(input: {
      recommendationId: string;
      kind: Decision["kind"];
      reason?: string;
    }): Promise<void>;
    deleteDecision(recommendationId: string): Promise<void>;
    /** Leert die Hinweise im Regel-Stand. */
    dismissNotices(): Promise<void>;
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
  decisions: Decision[];
  ruleState: RuleState | null;
  settings: Settings;
}

/** Phase 1 zeigt genau eine Person: die zuerst angelegte. */
async function loadAll(repo: Repository): Promise<Loaded> {
  const persons = await repo.getPersons();
  persons.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const person = persons[0] ?? null;
  const [vaccinations, decisions, ruleState, settings] = await Promise.all([
    person ? repo.getVaccinations(person.id) : Promise.resolve([]),
    person ? repo.getDecisions(person.id) : Promise.resolve([]),
    person ? repo.getRuleState(person.id) : Promise.resolve(null),
    repo.getSettings(),
  ]);
  return { person, vaccinations, decisions, ruleState, settings };
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
  decisions: [],
  ruleState: null,
  settings: DEFAULT_SETTINGS,
};

export function AppDataProvider(props: {
  open?: (events?: DatabaseEvents) => Promise<Repository>;
  /** Für Tests; sonst lädt die Seite neu. */
  reload?: () => void;
  /** Für Tests; sonst RULEBOOK. */
  rulebook?: Rulebook;
  /** Für Tests; sonst der heutige Tag. */
  today?: ISODate;
  children: ReactNode;
}) {
  // Nur beim ersten Rendern übernehmen, damit eine neue Funktion pro Rendern
  // die Datenbank nicht erneut öffnet.
  const [open] = useState(() => props.open ?? openRepository);
  const [reload] = useState(
    () => props.reload ?? (() => window.location.reload()),
  );
  const rulebook = props.rulebook ?? RULEBOOK;
  const today = props.today ?? todayISO();
  const [state, setState] = useState<State>(INITIAL);

  // Derselbe Stand wie `state.ruleState`, aber ohne neu zu rendern lesbar:
  // Der Abgleich unten baut auf ihm auf, ohne von `state.ruleState`
  // abzuhängen. Jede Zuweisung an `state.ruleState` setzt auch ihn.
  const ruleLatest = useRef<RuleState | null>(null);

  // Zeigt einen neuen Regel-Stand sofort und speichert ihn danach. Das
  // Speichern ändert den Zustand nicht mehr, ein älteres kann also keinen
  // neueren Stand überschreiben. In der Datenbank landet ebenfalls der
  // neueste: IndexedDB führt Schreibvorgänge auf denselben Store in der
  // Reihenfolge aus, in der sie beginnen, und saveRuleState beginnt sofort.
  const commitRuleState = useCallback((r: Repository, next: RuleState) => {
    ruleLatest.current = next;
    setState((s) => ({ ...s, ruleState: next }));
    return r.saveRuleState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function connect() {
      try {
        const repo = await open({
          // Eine neuere Version in einem anderen Tab braucht die Datenbank;
          // neu laden holt die neue Version auch hierher.
          onVersionChange: reload,
          onTerminated: () => {
            if (!cancelled) void connect();
          },
        });
        const loaded = await loadAll(repo);
        if (!cancelled) {
          ruleLatest.current = loaded.ruleState;
          setState({ status: "ready", repo, ...loaded });
        }
      } catch {
        if (!cancelled) {
          ruleLatest.current = null;
          setState({ ...INITIAL, status: "unavailable" });
        }
      }
    }
    void connect();
    return () => {
      cancelled = true;
    };
  }, [open, reload]);

  const { status, repo, person, vaccinations, decisions, settings } = state;
  const { leadMonths, seasonDay } = settings;

  const recommendations = useMemo(
    () =>
      person
        ? evaluate(person, vaccinations, decisions, today, rulebook, {
            leadMonths,
            seasonDay,
          })
        : [],
    [person, vaccinations, decisions, leadMonths, seasonDay, today, rulebook],
  );

  // Hält den Schnappschuss aktuell und erzeugt nach einem neueren Regelwerk
  // die Hinweise. Läuft nach dem Laden und nach jeder Änderung, die die
  // Empfehlungen ändert. commitRuleState ändert nur `state.ruleState`, von
  // dem der Effekt nicht abhängt; er löst sich also nicht selbst erneut aus.
  useEffect(() => {
    if (status !== "ready" || !repo || !person) return;
    const latest = ruleLatest.current;
    const prev = latest?.personId === person.id ? latest : null;
    const next = nextRuleState(prev, person.id, recommendations, rulebook);
    if (JSON.stringify(next) === JSON.stringify(prev)) return;
    commitRuleState(repo, next).catch(() => {
      // Nicht gespeichert: Beim nächsten Laden entsteht der Stand neu.
    });
  }, [status, repo, person, recommendations, rulebook, commitRuleState]);

  const requireRepo = useCallback((): Repository => {
    if (!repo) throw new Error("Speicher ist noch nicht bereit");
    return repo;
  }, [repo]);

  const requirePerson = useCallback((): Person => {
    if (!person) throw new Error("Es ist noch keine Person angelegt");
    return person;
  }, [person]);

  const createPerson = useCallback<AppData["actions"]["createPerson"]>(
    async ({ name, birthDate, answers = DEFAULT_ANSWERS }) => {
      const person: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        birthDate,
        answers,
        createdAt: new Date().toISOString(),
      };
      await requireRepo().savePerson(person);
      ruleLatest.current = null;
      setState((s) => ({
        ...s,
        person,
        vaccinations: [],
        decisions: [],
        ruleState: null,
      }));
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

  const saveDecision = useCallback<AppData["actions"]["saveDecision"]>(
    async ({ recommendationId, kind, reason }) => {
      const r = requireRepo();
      const decision: Decision = {
        personId: requirePerson().id,
        recommendationId,
        kind,
        at: new Date().toISOString(),
      };
      if (reason !== undefined) decision.reason = reason;
      await r.saveDecision(decision);
      setState((s) => ({
        ...s,
        decisions: [
          ...s.decisions.filter((d) => d.recommendationId !== recommendationId),
          decision,
        ],
      }));
    },
    [requireRepo, requirePerson],
  );

  const deleteDecision = useCallback(
    async (recommendationId: string) => {
      await requireRepo().deleteDecision(requirePerson().id, recommendationId);
      setState((s) => ({
        ...s,
        decisions: s.decisions.filter(
          (d) => d.recommendationId !== recommendationId,
        ),
      }));
    },
    [requireRepo, requirePerson],
  );

  const dismissNotices = useCallback(async () => {
    const current = ruleLatest.current;
    if (!current || current.notices.length === 0) return;
    await commitRuleState(requireRepo(), { ...current, notices: [] });
  }, [requireRepo, commitRuleState]);

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
      // Der Installationshinweis gehört zum Gerät, nicht in die Sicherung.
      // Die Daten auf dem Gerät entsprechen danach genau dieser Sicherung.
      const device = await r.getSettings();
      const settings: Settings = { ...b.settings, lastBackupAt: b.createdAt };
      delete settings.installHintDismissed;
      if (device.installHintDismissed !== undefined) {
        settings.installHintDismissed = device.installHintDismissed;
      }
      await r.replaceAll({
        persons: b.persons,
        vaccinations: b.vaccinations,
        decisions: b.decisions,
        settings,
      });
      // replaceAll hat den Regel-Stand geleert (er gehört nicht in die
      // Sicherung); er entsteht danach ohne Hinweise neu.
      const loaded = await loadAll(r);
      ruleLatest.current = loaded.ruleState;
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
      status,
      person,
      vaccinations,
      decisions,
      recommendations,
      ruleState: state.ruleState,
      settings,
      today,
      actions: {
        createPerson,
        updatePerson,
        saveVaccination,
        deleteVaccination,
        saveDecision,
        deleteDecision,
        dismissNotices,
        saveSettings,
        restore,
        exportData,
      },
    }),
    [
      status,
      person,
      vaccinations,
      decisions,
      recommendations,
      state.ruleState,
      settings,
      today,
      createPerson,
      updatePerson,
      saveVaccination,
      deleteVaccination,
      saveDecision,
      deleteDecision,
      dismissNotices,
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
